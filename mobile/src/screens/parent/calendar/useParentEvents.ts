import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { fetchParentChildren } from '../../../api/children';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useNow } from '../../../hooks/useNow';
import type { Event } from '@shared/types';

export function useParentEvents() {
  const { profile } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const nowMs = useNow();

  useEffect(() => {
    if (!profile?.uid) return;
    fetchParentChildren(profile.uid).then((children) => {
      if (children[0]) setSchoolId(children[0].schoolId);
    });
  }, [profile?.uid, refreshKey]);

  useEffect(() => {
    if (!schoolId) return;
    return onSnapshot(query(collection(db, 'schools', schoolId, 'events'), orderBy('startAt', 'desc')), (snap) => {
      setEvents(snap.docs.map((d) => ({ ...(d.data() as Event), id: d.id })));
      setRefreshing(false);
    });
  }, [schoolId, refreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return { schoolId, events, nowMs, refreshing, onRefresh };
}
