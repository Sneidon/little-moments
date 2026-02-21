'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';

export interface UseSchoolTeachersResult {
  teachers: UserProfile[];
  loading: boolean;
}

/** Teachers and principals for a school (role === 'teacher' | 'principal'). */
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
        setTeachers(list.filter((u) => u.role === 'teacher' || u.role === 'principal'));
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  return { teachers, loading };
}
