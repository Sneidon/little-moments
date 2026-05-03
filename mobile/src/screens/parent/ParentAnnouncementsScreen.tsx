import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/MainTabs';
import type { Announcement } from '../../../../shared/types';

function announcementPreviewMeta(item: Announcement): { chips: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] } {
  const chips: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (item.imageUrl) chips.push({ key: 'hero', icon: 'image-outline', label: 'Image' });
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [list, setList] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
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
    })();
  }, [profile?.uid, refreshTrigger]);

  useEffect(() => {
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
      setRefreshing(false);
    });
    return () => unsub();
  }, [schoolId, refreshTrigger]);

  const openDetail = useCallback(
    (item: Announcement) => {
      if (!schoolId) return;
      navigation.navigate('ParentAnnouncementDetail', { schoolId, announcementId: item.id });
    },
    [navigation, schoolId]
  );

  const renderItem = ({ item }: { item: Announcement }) => {
    const { chips } = announcementPreviewMeta(item);
    const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetail(item)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityHint="Opens full announcement"
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="megaphone" size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.chevron} />
          </View>
          {item.body?.trim() ? (
            <Text style={styles.bodyPreview} numberOfLines={3}>
              {item.body.trim()}
            </Text>
          ) : null}
          {chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((c) => (
                <View key={c.key} style={[styles.chip, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name={c.icon} size={14} color={colors.textSecondary} style={styles.chipIcon} />
                  <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{c.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.meta}>{dateLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!schoolId ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
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
    cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingRight: 4 },
    chevron: { marginTop: 2 },
    bodyPreview: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
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
