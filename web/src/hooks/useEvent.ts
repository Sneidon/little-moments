'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Event } from 'shared/types';

export function useEvent(
  schoolId: string | undefined,
  eventId: string | undefined
): { event: Event | null; loading: boolean } {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !eventId) {
      setEvent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'schools', schoolId, 'events', eventId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as Event);
      } else {
        setEvent(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, eventId]);

  return { event, loading };
}
