import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached, LIST_TTL_MS } from '../utils/cache';
import type { Child } from '../../../shared/types';
import type { ClassRoom } from '../../../shared/types';

const cacheKeyChildren = (schoolId: string, uid: string) =>
  `teacher:children:${schoolId}:${uid}`;
const cacheKeyClassName = (schoolId: string, uid: string) =>
  `teacher:className:${schoolId}:${uid}`;

export function useTeacherClassChildren(refreshTrigger: number) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const [cachedChildren, cachedClassName] = await Promise.all([
        getCached<Child[]>(cacheKeyChildren(schoolId, uid)),
        getCached<string | null>(cacheKeyClassName(schoolId, uid)),
      ]);
      if (cancelled) return;
      if (cachedChildren) setChildren(cachedChildren);
      if (cachedClassName != null) setClassName(cachedClassName);

      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      if (cancelled) return;
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      const classIds = myClasses.map((d) => d.id).slice(0, 10);
      const name = myClasses[0] ? (myClasses[0].data() as ClassRoom).name : null;
      setClassName(name);
      await setCached(cacheKeyClassName(schoolId, uid), name, LIST_TTL_MS);

      if (classIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds)
        ),
        (snap) => {
          if (cancelled) return;
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
          setChildren(list);
          setCached(cacheKeyChildren(schoolId, uid), list, LIST_TTL_MS);
          setLoading(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid, refreshTrigger]);

  return { children, className, loading };
}
