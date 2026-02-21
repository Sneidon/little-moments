'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Announcement } from 'shared/types';

export interface UseAnnouncementsResult {
  announcements: Announcement[];
  loading: boolean;
}

export function useAnnouncements(schoolId: string | undefined): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
      setLoading(false);
    });
    return () => unsub();
  }, [schoolId]);

  return { announcements, loading };
}
