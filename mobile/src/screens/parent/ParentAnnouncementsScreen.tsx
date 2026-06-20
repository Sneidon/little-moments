import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { markAnnouncementNotificationsRead } from '../../services/inAppNotifications';
import { AnnouncementMedia } from '../../components/AnnouncementMedia';
import { isVideoMedia } from '../../utils/media';
import type { Announcement } from '../../../../shared/types';

function announcementPreviewMeta(item: Announcement): { chips: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] } {
  const chips: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (item.imageUrl) {
    const isVideo = isVideoMedia(item.mediaType, item.imageUrl);
    chips.push({
      key: 'hero',
      icon: isVideo ? 'videocam-outline' : 'image-outline',
      label: isVideo ? 'Video' : 'Image',
    });
  }
  const docCount = item.documents?.length ?? 0;
  if (docCount > 0) {
    chips.push({
      key: 'docs',
      icon: 'document-text-outline',
      label: docCount === 1 ? '1 file' : `${docCount} files`,
    });
  }
  const linkCount = item.links?.length ?? 0;
  if (linkCount > 0) {
    chips.push({
      key: 'links',
      icon: 'link-outline',
      label: linkCount === 1 ? '1 link' : `${linkCount} links`,
    });
  }
  return { chips };
}

export function ParentAnnouncementsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolLookupDone, setSchoolLookupDone] = useState(false);
  const [list, setList] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      setSchoolLookupDone(true);
      return;
    }
    setSchoolLookupDone(false);
    setSchoolId(null);
    (async () => {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid),
          where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSchoolId(schoolDoc.id);
          break;
        }
      }
      setSchoolLookupDone(true);
    })();
  }, [profile?.uid, refreshTrigger]);

  useEffect(() => {
    if (!schoolId) {
      setList([]);
      setLoadingAnnouncements(!schoolLookupDone);
      setRefreshing(false);
      return;
    }
    setLoadingAnnouncements(true);
    const q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
        setLoadingAnnouncements(false);
        setRefreshing(false);
      },
      () => {
        setList([]);
        setLoadingAnnouncements(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, [schoolId, schoolLookupDone, refreshTrigger]);

  const toggleExpand = useCallback(
    (item: Announcement) => {
      setExpandedId((prev) => {
        const next = prev === item.id ? null : item.id;
        if (next && profile?.uid) {
          void markAnnouncementNotificationsRead(profile.uid, item.id);
        }
        return next;
      });
    },
    [profile?.uid]
  );

  const renderItem = ({ item }: { item: Announcement }) => {
    const isExpanded = expandedId === item.id;
    const { chips } = announcementPreviewMeta(item);
    const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded, { borderColor: colors.cardBorder }]}
        onPress={() => toggleExpand(item)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={isExpanded ? 'Collapse announcement' : 'Expand announcement'}
      >
        <View style={isExpanded ? styles.cardExpandedInner : styles.cardRow}>
          {!isExpanded ? (
            item.imageUrl ? (
              <AnnouncementMedia
                url={item.imageUrl}
                mediaType={item.mediaType}
                colors={colors}
                variant="thumbnail"
              />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="megaphone" size={28} color={colors.primary} />
              </View>
            )
          ) : null}
          <View style={[styles.cardContent, isExpanded && styles.cardContentExpanded]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
                {item.title}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
                style={styles.chevron}
              />
            </View>
            {!isExpanded && item.body?.trim() ? (
              <Text style={styles.bodyPreview} numberOfLines={2}>
                {item.body.trim()}
              </Text>
            ) : null}
            {!isExpanded && chips.length > 0 ? (
              <View style={styles.chipRow}>
                {chips.map((c) => (
                  <View key={c.key} style={[styles.chip, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name={c.icon} size={14} color={colors.textSecondary} style={styles.chipIcon} />
                    <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {isExpanded ? (
              <>
                {item.body?.trim() ? (
                  <Text style={[styles.bodyFull, { color: colors.textSecondary }]}>{item.body.trim()}</Text>
                ) : null}
                {item.imageUrl ? (
                  <AnnouncementMedia
                    url={item.imageUrl}
                    mediaType={item.mediaType}
                    colors={colors}
                    variant="expanded"
                  />
                ) : null}
                {item.documents?.map((d, i) =>
                  d.url ? (
                    <TouchableOpacity
                      key={`doc-${i}`}
                      style={[styles.attachmentRow, { borderColor: colors.cardBorder }]}
                      onPress={() => Linking.openURL(d.url)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                      <Text style={[styles.attachmentText, { color: colors.text }]} numberOfLines={2}>
                        {d.label || d.name || 'Attachment'}
                      </Text>
                      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null
                )}
                {item.links?.map((l, i) =>
                  l.url ? (
                    <TouchableOpacity
                      key={`link-${i}`}
                      style={[styles.attachmentRow, { borderColor: colors.cardBorder }]}
                      onPress={() => Linking.openURL(l.url)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="link-outline" size={18} color={colors.primary} />
                      <Text style={[styles.attachmentText, { color: colors.text }]} numberOfLines={2}>
                        {l.label || l.name || l.url}
                      </Text>
                      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null
                )}
              </>
            ) : null}
            <Text style={styles.meta}>{dateLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showLoading = !schoolLookupDone || (schoolId != null && loadingAnnouncements);

  return (
    <View style={styles.container}>
      {showLoading ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      ) : !schoolId ? (
        <View style={styles.listContent}>
          <EmptyState
            icon="megaphone-outline"
            title="No announcements"
            subtitle="Announcements from your daycare will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={expandedId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              title="No announcements"
              subtitle="Announcements from your daycare will appear here."
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardExpanded: {
      padding: 14,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    cardExpandedInner: {
      flexDirection: 'column',
    },
    thumbnail: {
      width: 88,
      height: 88,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
    },
    thumbnailPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: { flex: 1, marginLeft: 12, minWidth: 0 },
    cardContentExpanded: { marginLeft: 0 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingRight: 4 },
    chevron: { marginTop: 2 },
    bodyPreview: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
    bodyFull: { fontSize: 15, lineHeight: 22, marginTop: 10 },
    expandedImage: {
      width: '100%',
      height: 180,
      borderRadius: 10,
      marginTop: 12,
      backgroundColor: colors.backgroundSecondary,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    attachmentText: { flex: 1, fontSize: 14, fontWeight: '500' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    chipIcon: { marginRight: 4 },
    chipLabel: { fontSize: 12, fontWeight: '500' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
    listContent: { flexGrow: 1, padding: 16 },
  });
}
