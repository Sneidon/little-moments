import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import type { Event } from '@shared/types';
import { formatEventTimeRange } from '../calendar/calendarUtils';
import { normalizeEvent, type Rsvp } from './eventDetail';

export function useEventDetail(schoolId: string, eventId: string) {
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState<Rsvp | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'schools', schoolId, 'events', eventId),
      (snap) => {
        setLoading(false);
        setMissing(!snap.exists());
        setEvent(snap.exists() ? normalizeEvent(snap.id, snap.data() as Record<string, unknown>) : null);
      },
      () => {
        setLoading(false);
        setMissing(true);
      }
    );
  }, [schoolId, eventId]);

  const respond = useCallback(
    async (response: Rsvp) => {
      if (!profile?.uid || !event) return;
      setPending(response);
      try {
        await updateDoc(doc(db, 'schools', schoolId, 'events', eventId), { [`parentResponses.${profile.uid}`]: response });
        setEditing(false);
      } finally {
        setPending(null);
      }
    },
    [profile?.uid, event, schoolId, eventId]
  );

  const share = useCallback(async () => {
    if (!event) return;
    const lines = [event.title, formatEventTimeRange(event), event.description?.slice(0, 280) ?? ''].filter(Boolean);
    await Share.share({ title: event.title, message: lines.join('\n\n') }).catch(() => {});
  }, [event]);

  const myRsvp = profile?.uid ? event?.parentResponses?.[profile.uid] : undefined;

  return {
    event,
    loading,
    missing,
    uid: profile?.uid,
    rsvp: { mine: myRsvp, pending, editing, setEditing, respond },
    share,
  };
}
