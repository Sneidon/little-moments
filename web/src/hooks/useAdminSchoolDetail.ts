'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDoc, getDocs, doc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { School, ClassRoom, Child, UserProfile } from 'shared/types';

export interface UseAdminSchoolDetailResult {
  school: School | null;
  teachers: UserProfile[];
  classes: ClassRoom[];
  children: Child[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Load school document and its teachers, classes, and children for super admin view. */
export function useAdminSchoolDetail(schoolId: string | undefined): UseAdminSchoolDetailResult {
  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(!!schoolId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      setSchool(null);
      setTeachers([]);
      setClasses([]);
      setChildren([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [schoolSnap, usersSnap, classesSnap, childrenSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
        getDocs(collection(db, 'schools', schoolId, 'children')),
      ]);

      if (!schoolSnap.exists()) {
        setSchool(null);
        setTeachers([]);
        setClasses([]);
        setChildren([]);
        setError('School not found');
        return;
      }

      setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
      const staffList = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
      setTeachers(staffList.filter((u) => u.role === 'teacher' || u.role === 'principal'));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, schoolId, ...d.data() } as ClassRoom)));
      setChildren(
        childrenSnap.docs.map((d) => ({ id: d.id, schoolId, ...d.data() } as Child))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load school');
      setSchool(null);
      setTeachers([]);
      setClasses([]);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  return { school, teachers, classes, children, loading, error, refetch: load };
}
