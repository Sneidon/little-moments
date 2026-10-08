import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

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
      query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)),
      (snap) => {
        setCount(snap.size);
      },
      () => setCount(0)
    );

    return unsub;
  }, [profile?.uid]);

  return count;
}
