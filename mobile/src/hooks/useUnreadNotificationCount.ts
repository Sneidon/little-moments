import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { isInAppNotificationRead } from '../services/inAppNotifications';

/** Live count of unread in-app notifications for the header bell badge. */
export function useUnreadNotificationCount(): number {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      setCount(0);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, 'users', uid, 'notifications')),
      (snap) => {
        setCount(snap.docs.filter((d) => !isInAppNotificationRead(d.data() as { read?: boolean })).length);
      },
      () => setCount(0)
    );

    return unsub;
  }, [profile?.uid]);

  return count;
}
