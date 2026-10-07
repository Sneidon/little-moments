import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { markAnnouncementNotificationsRead } from '../../services/inAppNotifications';
import type { Announcement } from '@shared/types';
import { AnnouncementCard } from './announcements/AnnouncementCard';
import { useParentAnnouncements } from './announcements/useParentAnnouncements';

const empty = <EmptyState icon="megaphone-outline" title="No announcements" subtitle="Announcements from your daycare will appear here." />;

export function ParentAnnouncementsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { schoolId, list, loading, refreshing, onRefresh } = useParentAnnouncements();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const background = { flex: 1, backgroundColor: colors.background };

  const toggle = useCallback(
    (item: Announcement) => {
      const opening = expandedId !== item.id;
      setExpandedId(opening ? item.id : null);
      if (opening && profile?.uid) void markAnnouncementNotificationsRead(profile.uid, item.id);
    },
    [expandedId, profile?.uid]
  );

  if (loading) {
    return (
      <ScrollView style={background} contentContainerStyle={styles.content}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  }

  if (!schoolId) {
    return (
      <View style={background}>
        <View style={styles.content}>{empty}</View>
      </View>
    );
  }

  return (
    <FlatList
      style={background}
      data={list}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AnnouncementCard item={item} expanded={expandedId === item.id} onToggle={toggle} />}
      extraData={expandedId}
      contentContainerStyle={styles.content}
      ListEmptyComponent={empty}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 16 },
});
