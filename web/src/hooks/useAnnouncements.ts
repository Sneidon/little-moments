'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Announcement } from 'shared/types';

export interface UseAnnouncementsResult {
  announcements: Announcement[];
}

export function useAnnouncements(schoolId: string | undefined): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
    });
    return () => unsub();
  }, [schoolId]);

  return { announcements };
}
