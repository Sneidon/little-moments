import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Chat, UserProfile, UserRole } from '@shared/types';

export function useChatPartner(schoolId: string, chatId: string, role: UserRole | undefined, initialName?: string) {
  const fallback = role === 'parent' ? 'Daycare staff' : 'Parent';
  const [name, setName] = useState(initialName?.trim() || fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chatSnap = await getDoc(doc(db, 'schools', schoolId, 'chats', chatId));
        if (!chatSnap.exists() || cancelled) return;
        const chat = chatSnap.data() as Chat;
        const otherUid = role === 'teacher' ? chat.parentId : chat.teacherId;
        const user = (await getDoc(doc(db, 'users', otherUid))).data() as UserProfile | undefined;
        if (!cancelled) setName(user?.preferredName?.trim() || user?.displayName?.trim() || fallback);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, chatId, role, fallback]);

  return name;
}
