'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ClassRoom } from 'shared/types';
import type { Child } from 'shared/types';
import type { DailyReport } from 'shared/types';
import type { UserProfile } from 'shared/types';

export type ClassReportRow = DailyReport & { childId: string; childName: string };

export interface UseClassDetailResult {
  classRoom: ClassRoom | null;
  children: Child[];
  teachers: UserProfile[];
  reports: ClassReportRow[];
  loading: boolean;
}

export interface UseClassDetailOptions {
  /** When class is not found, redirect here. Default: /principal/classes */
  redirectPathIfNotFound?: string;
}

/**
 * Load class, children in class, school teachers, and all reports for those children.
 * Redirects if class not found.
 */
export function useClassDetail(
  schoolId: string | undefined,
  classId: string | undefined,
  options?: UseClassDetailOptions
): UseClassDetailResult {
  const router = useRouter();
  const redirectPath = options?.redirectPathIfNotFound ?? '/principal/classes';
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ClassReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const classSnap = await getDoc(
        doc(db, 'schools', schoolId, 'classes', classId)
      );
      if (!cancelled && !classSnap.exists()) {
        router.replace(redirectPath);
        return;
      }
      if (!cancelled && classSnap.exists()) {
        setClassRoom({ id: classSnap.id, ...classSnap.data() } as ClassRoom);
      }

      const [childrenSnap, teachersSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'schools', schoolId, 'children'),
            where('classId', '==', classId)
          )
        ),
        getDocs(
          query(collection(db, 'users'), where('schoolId', '==', schoolId))
        ),
      ]);
      const childList = childrenSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Child)
      );
      const teacherList = teachersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter((u) => u.role === 'teacher' || u.role === 'principal');
      if (!cancelled) {
        setChildren(childList);
        setTeachers(teacherList);
      }

      const list: ClassReportRow[] = [];
      for (const child of childList) {
        const name = child.name ?? child.id;
        const reportsSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', child.id, 'reports'),
            orderBy('timestamp', 'desc')
          )
        );
        reportsSnap.docs.forEach((r) => {
          list.push({
            id: r.id,
            ...r.data(),
            childId: child.id,
            childName: name,
          } as ClassReportRow);
        });
      }
      list.sort((a, b) =>
        (b.timestamp || '').localeCompare(a.timestamp || '')
      );
      if (!cancelled) setReports(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, classId, router, redirectPath]);

  return { classRoom, children, teachers, reports, loading };
}
