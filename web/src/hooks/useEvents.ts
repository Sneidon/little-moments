'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Event } from 'shared/types';

export interface UseEventsResult {
  events: Event[];
  upcoming: Event[];
  past: Event[];
}

export function useEvents(schoolId: string | undefined): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'events'),
      orderBy('startAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    });
    return () => unsub();
  }, [schoolId]);

  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.startAt >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = events.filter((e) => e.startAt < now);

  return { events, upcoming, past };
}
