import { useEffect, useState } from 'react';
import { collection, collectionGroup, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { Chat } from '../../../shared/types';
import { isChatUnreadForUser } from '../utils/chatUnread';

/** Live count of chats with unread messages for the Messages tab badge. */
export function useUnreadMessageCount(): number {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const uid = profile?.uid;
    const schoolId = profile?.schoolId;
    const role = profile?.role;
    if (!uid || (role !== 'teacher' && role !== 'parent')) {
      setCount(0);
      return;
    }
    if (role === 'teacher' && !schoolId) {
      setCount(0);
      return;
    }

    const q =
      role === 'teacher'
        ? query(
            collection(db, 'schools', schoolId!, 'chats'),
            where('teacherId', '==', uid),
            orderBy('updatedAt', 'desc')
          )
        : query(
            collectionGroup(db, 'chats'),
            where('parentId', '==', uid),
            orderBy('updatedAt', 'desc')
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
        setCount(chats.filter((c) => isChatUnreadForUser(c, uid, role)).length);
      },
      () => setCount(0)
    );

    return unsub;
  }, [profile?.uid, profile?.schoolId, profile?.role]);

  return count;
}
