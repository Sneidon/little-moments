import { useEffect, useState } from 'react';
import { collection, collectionGroup, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Chat, Child, UserProfile } from '@shared/types';

export type ChatWithNames = Chat & { otherDisplayName: string; childName: string };

async function readName<T>(path: string[], pick: (data: T) => string | undefined): Promise<string | undefined> {
  try {
    const snap = await getDoc(doc(db, path[0], ...path.slice(1)));
    return snap.exists() ? pick(snap.data() as T) : undefined;
  } catch {
    return undefined;
  }
}

async function withNames(chat: Chat, isTeacher: boolean): Promise<ChatWithNames> {
  const otherUid = isTeacher ? chat.parentId : chat.teacherId;
  const [otherDisplayName, childName] = await Promise.all([
    readName<UserProfile>(['users', otherUid], (u) => u.displayName || otherUid.slice(0, 8)),
    readName<Child>(['schools', chat.schoolId, 'children', chat.childId], (c) => c.name || 'Child'),
  ]);
  return { ...chat, otherDisplayName: otherDisplayName ?? '…', childName: childName ?? '…' };
}

export function useChatList(refreshTrigger: number) {
  const { profile, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<ChatWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const uid = profile?.uid;
    const schoolId = profile?.schoolId;
    const isTeacher = profile?.role === 'teacher';
    if (!uid || (isTeacher && !schoolId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = isTeacher
      ? query(collection(db, 'schools', schoolId!, 'chats'), where('teacherId', '==', uid), orderBy('updatedAt', 'desc'))
      : query(collectionGroup(db, 'chats'), where('parentId', '==', uid), orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      async (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;
        const list = snap.docs.map((d) => ({ ...(d.data() as Chat), id: d.id }));
        setChats(await Promise.all(list.map((c) => withNames(c, isTeacher))));
        setLoading(false);
      },
      () => {
        setChats([]);
        setLoading(false);
      }
    );
  }, [authLoading, profile?.uid, profile?.schoolId, profile?.role, refreshTrigger]);

  return { chats, loading: authLoading || loading };
}
