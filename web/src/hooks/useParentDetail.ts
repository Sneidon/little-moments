'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export interface UseParentDetailResult {
  parent: UserProfile | null;
  children: Child[];
  classes: ClassRoom[];
  loading: boolean;
}

/**
 * Load parent (user with role=parent), their linked children at this school, and classes.
 * Redirects to /principal/parents if parent not found or not in this school.
 */
export function useParentDetail(
  schoolId: string | undefined,
  parentId: string | undefined
): UseParentDetailResult {
  const router = useRouter();
  const [parent, setParent] = useState<UserProfile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !parentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [parentSnap, classesSnap] = await Promise.all([
        getDoc(doc(db, 'users', parentId)),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);
      if (cancelled) return;
      if (!parentSnap.exists()) {
        router.replace('/principal/parents');
        return;
      }
      const parentData = { uid: parentSnap.id, ...parentSnap.data() } as UserProfile;
      if (parentData.role !== 'parent' || parentData.schoolId !== schoolId) {
        router.replace('/principal/parents');
        return;
      }
      setParent(parentData);
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));

      const childrenSnap = await getDocs(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('parentIds', 'array-contains', parentId)
        )
      );
      if (!cancelled) {
        setChildren(childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, parentId, router]);

  return { parent, children, classes, loading };
}
