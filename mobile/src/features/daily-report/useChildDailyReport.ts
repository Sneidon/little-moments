import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ReportWithExtras } from '../../utils/childDailyReportDisplay';
import type { Child, ClassRoom } from '@shared/types';

export function useChildDailyReport(schoolId: string | undefined, childId: string) {
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [childLoading, setChildLoading] = useState(true);
  const [childMissing, setChildMissing] = useState(false);
  const [reports, setReports] = useState<ReportWithExtras[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !childId) {
      setChildLoading(false);
      return;
    }
    let cancelled = false;
    setChildLoading(true);
    setChildMissing(false);
    setChild(null);
    setClassName(null);
    setTeacherId(null);
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
        if (cancelled) return;
        if (!snap.exists()) {
          setChildMissing(true);
          return;
        }
        const data = { ...(snap.data() as Child), id: snap.id };
        setChild(data);
        let resolvedTeacherId = data.assignedTeacherId ?? null;
        if (data.classId) {
          const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', data.classId));
          if (!cancelled && classSnap.exists()) {
            const cls = classSnap.data() as ClassRoom;
            setClassName(cls.name ?? null);
            resolvedTeacherId = resolvedTeacherId ?? cls.assignedTeacherId ?? null;
          }
        }
        if (!cancelled) setTeacherId(resolvedTeacherId);
      } catch {
        if (!cancelled) setChildMissing(true);
      } finally {
        if (!cancelled) setChildLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId]);

  useEffect(() => {
    if (!schoolId || !childId) return;
    const q = query(collection(db, 'schools', schoolId, 'children', childId, 'reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ ...(d.data() as ReportWithExtras), id: d.id })));
        setReportsLoading(false);
      },
      () => setReportsLoading(false)
    );
  }, [schoolId, childId]);

  return { child, className, teacherId, childLoading, childMissing, reports, reportsLoading };
}
