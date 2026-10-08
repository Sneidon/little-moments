import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { fetchParentChildren } from '../../api/children';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { markAllAnnouncementNotificationsRead, markAnnouncementNotificationsRead } from '../../services/inAppNotifications';
import type { Announcement } from '@shared/types';

const PAGE_SIZE = 20;

export type AnnouncementFilter = 'all' | 'unread';

// Parents have no schoolId on their profile, so use the school of their first linked child.
function useAnnouncementSchoolId() {
  const { profile } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!profile?.uid) return setSchoolId(null);
    if (profile.role !== 'parent') return setSchoolId(profile.schoolId ?? null);
    let cancelled = false;
    fetchParentChildren(profile.uid)
      .then((children) => !cancelled && setSchoolId(children[0]?.schoolId ?? null))
      .catch(() => !cancelled && setSchoolId(null));
    return () => {
      cancelled = true;
    };
  }, [profile?.uid, profile?.role, profile?.schoolId]);
  return schoolId;
}

// An announcement counts as unread while the user still has an unread in-app notification for it.
function useUnreadAnnouncementIds(uid: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)),
      (snap) => setIds(new Set(snap.docs.map((d) => d.data().announcementId as string | undefined).filter((x): x is string => !!x))),
      () => setIds(new Set())
    );
  }, [uid]);
  return ids;
}

export function useAnnouncementsFeed() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const schoolId = useAnnouncementSchoolId();
  const unreadIds = useUnreadAnnouncementIds(uid);
  const [items, setItems] = useState<Announcement[]>([]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<AnnouncementFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (schoolId === undefined) return;
    if (!schoolId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'schools', schoolId, 'announcements'), orderBy('createdAt', 'desc'), limit(pageSize));
    const done = () => {
      setLoading(false);
      setRefreshing(false);
    };
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id })));
        done();
      },
      () => {
        setItems([]);
        done();
      }
    );
  }, [schoolId, pageSize, refreshKey]);

  const isUnread = useCallback((id: string) => unreadIds.has(id) && !locallyRead.has(id), [unreadIds, locallyRead]);
  const visible = useMemo(() => (filter === 'unread' ? items.filter((a) => isUnread(a.id)) : items), [filter, items, isUnread]);
  const unreadCount = items.filter((a) => isUnread(a.id)).length;
  const hasMore = items.length >= pageSize;

  const toggle = useCallback(
    (item: Announcement) => {
      const opening = expandedId !== item.id;
      setExpandedId(opening ? item.id : null);
      if (opening && uid && isUnread(item.id)) {
        setLocallyRead((prev) => new Set(prev).add(item.id));
        void markAnnouncementNotificationsRead(uid, item.id);
      }
    },
    [expandedId, uid, isUnread]
  );

  return {
    items: visible,
    loading: loading || schoolId === undefined,
    hasSchool: !!schoolId,
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      setRefreshKey((k) => k + 1);
    },
    filter,
    setFilter,
    unreadCount,
    isUnread,
    expandedId,
    toggle,
    hasMore,
    loadMore: () => hasMore && setPageSize((n) => n + PAGE_SIZE),
    markAllRead: async () => {
      if (uid) await markAllAnnouncementNotificationsRead(uid);
    },
  };
}
