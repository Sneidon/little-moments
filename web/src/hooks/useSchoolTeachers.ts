'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';
import { userHasRole } from '@/lib/roles';

export interface UseSchoolTeachersResult {
  teachers: UserProfile[];
  loading: boolean;
}

export function useSchoolTeachers(schoolId: string | undefined): UseSchoolTeachersResult {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setTeachers(list.filter((u) => userHasRole(u, 'teacher') || userHasRole(u, 'principal')));
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  return { teachers, loading };
}
