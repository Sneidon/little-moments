import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationFilters } from '../../features/notifications/NotificationFilters';
import { NotificationRow } from '../../features/notifications/NotificationRow';
import { groupByDay, type NotificationItem } from '../../features/notifications/notificationDisplay';
import { useUserNotifications } from '../../features/notifications/useUserNotifications';
import { navigateFromNotificationData } from '../../hooks/useNotificationNavigation';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import type { RootStackParamList } from '../../navigation/types';
import { radius, type as typeTokens } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'UserNotifications'>;

function LoadingRows() {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={84} borderRadius={radius.card} />
      ))}
    </View>
  );
}

export function UserNotificationsScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { brand } = useTheme();
  const { withLoader, notify } = useFeedback();
  const styles = useThemedStyles(createStyles);
  const n = useUserNotifications();
  const sections = useMemo(() => groupByDay(n.items), [n.items]);

  const open = useCallback(
    (item: NotificationItem) => {
      void n.markRead(item);
      const { id: _id, title: _t, body: _b, createdAt: _c, read: _r, ...data } = item;
      navigateFromNotificationData(
        navigation as unknown as Parameters<typeof navigateFromNotificationData>[0],
        data,
        profile?.role === 'parent'
      );
    },
    [n, navigation, profile?.role]
  );

  const markAll = async () => {
    try {
      await withLoader(n.markAllRead(), 'Marking as read…');
    } catch {
      void notify({ tone: 'error', title: 'Error', message: 'Could not mark notifications as read. Please try again.' });
    }
  };

  const empty = n.error ? (
    <EmptyCard icon="notifications-off-outline" title="Notifications unavailable" body={n.error} />
  ) : n.filter === 'unread' ? (
    <EmptyCard icon="checkmark-done-outline" title="You're all caught up" body="No unread notifications." />
  ) : (
    <EmptyCard icon="notifications-outline" title="No notifications yet" body="New alerts will appear here." />
  );

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={n.loading ? [] : sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow item={item} onPress={open} />}
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <NotificationFilters filter={n.filter} onChange={n.setFilter} unreadCount={n.unreadCount} onMarkAllRead={() => void markAll()} />
      }
      ListEmptyComponent={n.loading ? <LoadingRows /> : empty}
      ListFooterComponent={n.hasMore ? <ActivityIndicator style={styles.footer} color={brand.textTertiary} /> : null}
      onEndReached={n.loadMore}
      onEndReachedThreshold={0.4}
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
