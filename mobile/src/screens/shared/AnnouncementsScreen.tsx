import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { AnnouncementMedia } from '../../components/AnnouncementMedia';
import type { Announcement } from '../../../../shared/types';

export function AnnouncementsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.schoolId) {
      setList([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'schools', profile.schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setList([]);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, [profile?.schoolId, refreshTrigger, authLoading]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderItem = ({ item }: { item: Announcement }) => {
    const isExpanded = expandedId === item.id;
    const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: colors.cardBorder }]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Ionicons name="megaphone" size={24} color={colors.primary} style={styles.cardIcon} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
              {item.title}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
          {!isExpanded && item.body?.trim() ? (
            <Text style={styles.bodyPreview} numberOfLines={2}>
              {item.body.trim()}
            </Text>
          ) : null}
          {isExpanded ? (
            <>
              {item.body?.trim() ? <Text style={styles.body}>{item.body.trim()}</Text> : null}
              {item.imageUrl ? (
                <AnnouncementMedia
                  url={item.imageUrl}
                  mediaType={item.mediaType}
                  colors={colors}
                  variant="expanded"
                />
              ) : null}
              {item.documents && item.documents.length > 0 ? (
                <View style={styles.documents}>
                  {item.documents.map((d, i) =>
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
                </View>
              ) : null}
              {item.links && item.links.length > 0 ? (
                <View style={styles.documents}>
                  {item.links.map((l, i) =>
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
                </View>
              ) : null}
            </>
          ) : null}
          <Text style={styles.meta}>{dateLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const showLoading = authLoading || loading;

  return (
    <View style={styles.container}>
      {showLoading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
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
              subtitle="School announcements will appear here."
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
    },
    cardIcon: { marginRight: 12 },
    cardContent: { flex: 1, minWidth: 0 },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
    bodyPreview: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
    body: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
    documents: { marginTop: 8, gap: 8 },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    attachmentText: { flex: 1, fontSize: 14 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  });
}
