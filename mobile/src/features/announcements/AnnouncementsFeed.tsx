import React, { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { Skeleton } from '../../components/Skeleton';
import { useFeedback } from '../../context/FeedbackContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { radius, type as typeTokens } from '../../theme/tokens';
import { groupByDay } from '../../utils/groupByDay';
import { NotificationFilters } from '../notifications/NotificationFilters';
import { AnnouncementRow } from './AnnouncementRow';
import { useAnnouncementsFeed } from './useAnnouncementsFeed';

function LoadingRows() {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={96} borderRadius={radius.card} />
      ))}
    </View>
  );
}

export function AnnouncementsFeed() {
  const { brand } = useTheme();
  const { withLoader, notify } = useFeedback();
  const styles = useThemedStyles(createStyles);
  const feed = useAnnouncementsFeed();
  const sections = useMemo(() => groupByDay(feed.items), [feed.items]);

  const markAll = async () => {
    try {
      await withLoader(feed.markAllRead(), 'Marking as read…');
    } catch {
      void notify({ tone: 'error', title: 'Error', message: 'Could not mark announcements as read. Please try again.' });
    }
  };

  const empty =
    feed.filter === 'unread' ? (
      <EmptyCard icon="checkmark-done-outline" title="You're all caught up" body="No unread announcements." />
    ) : (
      <EmptyCard icon="megaphone-outline" title="No announcements" body="Announcements from your school will appear here." />
    );

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={feed.loading ? [] : sections}
      keyExtractor={(item) => item.id}
      extraData={feed.expandedId}
      renderItem={({ item }) => (
        <AnnouncementRow item={item} unread={feed.isUnread(item.id)} expanded={feed.expandedId === item.id} onToggle={feed.toggle} />
      )}
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        feed.hasSchool ? (
          <NotificationFilters filter={feed.filter} onChange={feed.setFilter} unreadCount={feed.unreadCount} onMarkAllRead={() => void markAll()} />
        ) : null
      }
      ListEmptyComponent={feed.loading ? <LoadingRows /> : empty}
      ListFooterComponent={feed.hasMore && feed.filter === 'all' ? <ActivityIndicator style={styles.footer} color={brand.textTertiary} /> : null}
      onEndReached={feed.filter === 'all' ? feed.loadMore : undefined}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.onRefresh} tintColor={brand.textPrimary} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
    sectionTitle: { ...typeTokens.overline, color: brand.textTertiary, marginTop: 18, marginBottom: 10 },
    footer: { paddingVertical: 16 },
  });
