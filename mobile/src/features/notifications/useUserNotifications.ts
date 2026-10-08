import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { markAllInAppNotificationsRead, markInAppNotificationRead } from '../../services/inAppNotifications';
import type { NotificationItem } from './notificationDisplay';

const PAGE_SIZE = 30;
const UNREAD_CAP = 100;

export type NotificationFilter = 'all' | 'unread';

const byNewest = (a: NotificationItem, b: NotificationItem) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export function useUserNotifications() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [all, setAll] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setAll([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(pageSize));
    return onSnapshot(
      q,
      (snap) => {
        setAll(snap.docs.map((d) => ({ ...(d.data() as NotificationItem), id: d.id })));
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Notifications are not available yet.');
        setLoading(false);
      }
    );
  }, [uid, pageSize]);

  // Equality-only query: Firestore indexes it automatically, so no composite index is needed.
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'notifications'), where('read', '==', false), limit(UNREAD_CAP));
    return onSnapshot(
      q,
      (snap) => setUnread(snap.docs.map((d) => ({ ...(d.data() as NotificationItem), id: d.id })).sort(byNewest)),
      () => setUnread([])
    );
  }, [uid]);

  const withLocalReads = useCallback(
    (list: NotificationItem[]) => list.map((n) => (locallyRead.has(n.id) ? { ...n, read: true } : n)),
    [locallyRead]
  );

  const items = useMemo(
    () => (filter === 'all' ? withLocalReads(all) : unread.filter((n) => !locallyRead.has(n.id))),
    [filter, all, unread, locallyRead, withLocalReads]
  );
  const unreadCount = unread.filter((n) => !locallyRead.has(n.id)).length;
  const hasMore = filter === 'all' && all.length >= pageSize;

  const markRead = useCallback(
    async (item: NotificationItem) => {
      if (!uid || item.read === true) return;
      setLocallyRead((prev) => new Set(prev).add(item.id));
      await markInAppNotificationRead(uid, item.id);
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    await markAllInAppNotificationsRead(uid);
  }, [uid]);

  return {
    items,
    loading,
    error,
    filter,
    setFilter,
    unreadCount,
    hasMore,
    loadMore: () => hasMore && setPageSize((n) => n + PAGE_SIZE),
    markRead,
    markAllRead,
  };
}
