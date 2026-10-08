import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ChatMessage } from '@shared/types';
import { docToChatMessage, mergeMessagesByIdAsc } from './messageList';

const PAGE_SIZE = 40;

export function useChatMessages(schoolId: string, chatId: string) {
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [recent, setRecent] = useState<ChatMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const recentOldestSnap = useRef<QueryDocumentSnapshot | null>(null);
  const olderCursor = useRef<QueryDocumentSnapshot | null>(null);
  const prevRecent = useRef<ChatMessage[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    setOlder([]);
    setRecent([]);
    setHasMoreOlder(true);
    setLoadingInitial(true);
    recentOldestSnap.current = null;
    olderCursor.current = null;
    prevRecent.current = [];
    inFlight.current = false;

    const q = query(collection(db, 'schools', schoolId, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    return onSnapshot(q, (snap) => {
      if (snap.empty && snap.metadata.fromCache) return;
      setLoadingInitial(false);
      recentOldestSnap.current = snap.docs[snap.docs.length - 1] ?? null;
      const asc = [...snap.docs].reverse().map(docToChatMessage);
      const ids = new Set(asc.map((m) => m.id));
      const evicted = prevRecent.current.filter((m) => !ids.has(m.id));
      if (evicted.length > 0) setOlder((p) => mergeMessagesByIdAsc(p, evicted));
      prevRecent.current = asc;
      setRecent(asc);
      setHasMoreOlder(snap.docs.length >= PAGE_SIZE);
    });
  }, [schoolId, chatId]);

  const loadOlder = useCallback(async () => {
    if (inFlight.current || !hasMoreOlder) return;
    const cursor = olderCursor.current ?? recentOldestSnap.current;
    if (!cursor) {
      setHasMoreOlder(false);
      return;
    }
    inFlight.current = true;
    setLoadingOlder(true);
    try {
      const q = query(
        collection(db, 'schools', schoolId, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreOlder(false);
        return;
      }
      setOlder((p) => mergeMessagesByIdAsc(p, [...snap.docs].reverse().map(docToChatMessage)));
      olderCursor.current = snap.docs[snap.docs.length - 1] ?? null;
      if (snap.docs.length < PAGE_SIZE) setHasMoreOlder(false);
    } finally {
      setLoadingOlder(false);
      inFlight.current = false;
    }
  }, [schoolId, chatId, hasMoreOlder]);

  const messages = useMemo(() => mergeMessagesByIdAsc(older, recent), [older, recent]);

  return { messages, recent, loadingInitial, loadingOlder, loadOlder };
}
