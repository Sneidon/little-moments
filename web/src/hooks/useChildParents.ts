'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Child } from 'shared/types';
import type { UserProfile } from 'shared/types';

export interface UseChildParentsResult {
  parents: UserProfile[];
  refetch: () => Promise<void>;
}

export function useChildParents(child: Child | null): UseChildParentsResult {
  const [parents, setParents] = useState<UserProfile[]>([]);

  const fetchParents = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setParents([]);
      return;
    }
    const snaps = await Promise.all(ids.map((uid) => getDoc(doc(db, 'users', uid))));
    setParents(
      snaps
        .filter((s) => s.exists())
        .map((s) => ({ uid: s.id, ...s.data() } as UserProfile))
    );
  }, []);

  useEffect(() => {
    const ids = child?.parentIds ?? [];
    if (ids.length === 0) {
      setParents([]);
      return;
    }
    fetchParents(ids);
  }, [child?.parentIds, fetchParents]);

  const refetch = useCallback(async () => {
    const ids = child?.parentIds ?? [];
    if (ids.length === 0) {
      setParents([]);
      return;
    }
    const snaps = await Promise.all(ids.map((uid: string) => getDoc(doc(db, 'users', uid))));
    setParents(
      snaps
        .filter((s) => s.exists())
        .map((s) => ({ uid: s.id, ...s.data() } as UserProfile))
    );
  }, [child?.parentIds]);

  return { parents, refetch };
}
