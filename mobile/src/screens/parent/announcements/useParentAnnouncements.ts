import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { fetchParentChildren } from '../../../api/children';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import type { Announcement } from '@shared/types';

export function useParentAnnouncements() {
  const { profile } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [list, setList] = useState<Announcement[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      setLookupDone(true);
      return;
    }
    setLookupDone(false);
    setSchoolId(null);
    fetchParentChildren(uid)
      .then((children) => setSchoolId(children[0]?.schoolId ?? null))
      .catch(() => setSchoolId(null))
      .finally(() => setLookupDone(true));
  }, [profile?.uid, refreshKey]);

  useEffect(() => {
    if (!schoolId) {
      setList([]);
      setListLoading(!lookupDone);
      setRefreshing(false);
      return;
    }
    setListLoading(true);
    const done = () => {
      setListLoading(false);
      setRefreshing(false);
    };
    return onSnapshot(
      query(collection(db, 'schools', schoolId, 'announcements'), orderBy('createdAt', 'desc')),
      (snap) => {
        setList(snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id })));
        done();
      },
      () => {
        setList([]);
        done();
      }
    );
  }, [schoolId, lookupDone, refreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    schoolId,
    list,
    loading: !lookupDone || (schoolId != null && listLoading),
    refreshing,
    onRefresh,
  };
}
