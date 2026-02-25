'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface RSVPChildInfo {
  name: string;
  className: string;
}

export interface RSVPEntry {
  uid: string;
  response: 'accepted' | 'declined';
  displayName: string | null;
  children: RSVPChildInfo[];
}

export function useEventRSVPs(
  schoolId: string | undefined,
  parentResponses: Record<string, 'accepted' | 'declined'> | undefined
): { entries: RSVPEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<RSVPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !parentResponses || Object.keys(parentResponses).length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const classNames: Record<string, string> = {};
      classesSnap.docs.forEach((d) => {
        const data = d.data() as { name?: string };
        classNames[d.id] = data?.name ?? d.id;
      });

      const uids = Object.keys(parentResponses);
      const results = await Promise.all(
        uids.map(async (uid) => {
          const [userSnap, childrenSnap] = await Promise.all([
            getDoc(doc(db, 'users', uid)),
            getDocs(
              query(
                collection(db, 'schools', schoolId, 'children'),
                where('parentIds', 'array-contains', uid)
              )
            ),
          ]);
          const userData = userSnap.exists() ? (userSnap.data() as { displayName?: string }) : null;
          const children: RSVPChildInfo[] = childrenSnap.docs.map((d) => {
            const data = d.data() as { name?: string; preferredName?: string; classId?: string };
            const className = data.classId ? (classNames[data.classId] ?? data.classId) : '—';
            return {
              name: data.preferredName ?? data.name ?? '—',
              className,
            };
          });
          return {
            uid,
            response: parentResponses[uid],
            displayName: userData?.displayName ?? null,
            children,
          };
        })
      );
      if (!cancelled) {
        setEntries(
          results.sort((a, b) => {
            const nameA = a.displayName ?? a.uid;
            const nameB = b.displayName ?? b.uid;
            return nameA.localeCompare(nameB);
          })
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolId, parentResponses]);

  return { entries, loading };
}
