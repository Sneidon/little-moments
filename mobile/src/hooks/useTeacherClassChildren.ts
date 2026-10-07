import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { fetchTeacherClasses } from '../api/classes';
import { subscribeClassChildren } from '../api/children';
import { getCached, setCached, LIST_TTL_MS } from '../utils/cache';
import type { Child, ClassRoom } from '@shared/types';

const cacheKeyChildren = (schoolId: string, uid: string) => `teacher:children:${schoolId}:${uid}`;
const cacheKeyClassName = (schoolId: string, uid: string) => `teacher:className:${schoolId}:${uid}`;
const cacheKeySchoolName = (schoolId: string) => `teacher:schoolName:${schoolId}`;

export function useTeacherClassChildren(refreshTrigger = 0) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setChildren([]);
      setClasses([]);
      setSchoolName(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const [cachedChildren, cachedClassName, cachedSchoolName] = await Promise.all([
        getCached<Child[]>(cacheKeyChildren(schoolId, uid)),
        getCached<string | null>(cacheKeyClassName(schoolId, uid)),
        getCached<string | null>(cacheKeySchoolName(schoolId)),
      ]);
      if (cancelled) return;
      if (cachedChildren) setChildren(cachedChildren);
      if (cachedClassName != null) setClassName(cachedClassName);
      if (cachedSchoolName != null) setSchoolName(cachedSchoolName);

      const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
      if (!cancelled && schoolSnap.exists()) {
        const n = (schoolSnap.data() as { name?: string }).name?.trim() || null;
        setSchoolName(n);
        if (n) await setCached(cacheKeySchoolName(schoolId), n, LIST_TTL_MS);
      }

      const myClasses = await fetchTeacherClasses(schoolId, uid);
      if (cancelled) return;
      setClasses(myClasses);
      const name = myClasses[0]?.name ?? null;
      setClassName(name);
      await setCached(cacheKeyClassName(schoolId, uid), name, LIST_TTL_MS);

      unsub = subscribeClassChildren(
        schoolId,
        myClasses.map((c) => c.id),
        (list) => {
          if (cancelled) return;
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

  return { children, classes, className, schoolName, loading };
}
