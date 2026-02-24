'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import type { DailyReport } from 'shared/types';

export interface UseChildDetailResult {
  child: Child | null;
  setChild: React.Dispatch<React.SetStateAction<Child | null>>;
  classes: ClassRoom[];
  reports: DailyReport[];
  loading: boolean;
}

export interface UseChildDetailOptions {
  /** When child is not found, redirect here. Default: /principal/children */
  redirectPathIfNotFound?: string;
}

/**
 * Load child, classes, and reports for a school/child. Redirects if child not found.
 */
export function useChildDetail(
  schoolId: string | undefined,
  childId: string | undefined,
  options?: UseChildDetailOptions
): UseChildDetailResult {
  const router = useRouter();
  const redirectPath = options?.redirectPathIfNotFound ?? '/principal/children';
  const [child, setChild] = useState<Child | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !childId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [childSnap, classesSnap, reportsSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId, 'children', childId)),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
        getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', childId, 'reports'),
            orderBy('timestamp', 'desc')
          )
        ),
      ]);
      if (cancelled) return;
      if (!childSnap.exists()) {
        router.replace(redirectPath);
        return;
      }
      setChild({ id: childSnap.id, ...childSnap.data() } as Child);
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
      setReports(reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId, router, redirectPath]);

  return { child, setChild, classes, reports, loading };
}
