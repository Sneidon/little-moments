import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getCachedParentChildren, refreshParentChildren } from '../../../api/children';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getCached, LIST_TTL_MS, setCached } from '../../../utils/cache';
import { isParentVisibleReportType } from '../../../utils/childDailyReportDisplay';
import type { Child, ClassRoom, DailyReport } from '@shared/types';

function useParentChildren(refreshKey: number) {
  const { profile, selectedChildId, setSelectedChildId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    const apply = (list: Child[]) => {
      setChildren(list);
      setSelectedChildId((prev) => (!prev || !list.some((c) => c.id === prev) ? list[0].id : prev));
    };
    (async () => {
      const cached = await getCachedParentChildren(uid);
      if (cached?.length) apply(cached);
      const list = await refreshParentChildren(uid);
      if (list.length > 0) apply(list);
      else setChildren(list);
    })();
  }, [profile?.uid, setSelectedChildId, refreshKey]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];
  return { children, selectedChild, selectedChildId, setSelectedChildId };
}

function useClassName(schoolId: string | undefined, classId: string | undefined) {
  const [className, setClassName] = useState<string | null>(null);
  useEffect(() => {
    if (!schoolId || !classId) {
      setClassName(null);
      return;
    }
    const cacheKey = `parent:class:${schoolId}:${classId}`;
    (async () => {
      const cached = await getCached<string | null>(cacheKey);
      if (cached != null) setClassName(cached);
      const snap = await getDoc(doc(db, 'schools', schoolId, 'classes', classId));
      if (!snap.exists()) {
        setClassName(null);
        return;
      }
      const name = (snap.data() as ClassRoom).name;
      setClassName(name);
      await setCached(cacheKey, name, LIST_TTL_MS);
    })();
  }, [schoolId, classId]);
  return className;
}

function useDayReports(child: Child | undefined, date: string, refreshKey: number, onLoaded: () => void) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  useEffect(() => {
    if (!child?.schoolId || !child?.id) return;
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    const q = query(collection(db, 'schools', child.schoolId, 'children', child.id, 'reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as DailyReport), id: d.id }));
      setReports(list.filter((r) => r.timestamp >= start && r.timestamp <= end && isParentVisibleReportType(r.type)));
      onLoaded();
    });
  }, [child?.id, child?.schoolId, date, refreshKey, onLoaded]);
  return reports;
}

export function useParentHomeData(selectedDate: string) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const family = useParentChildren(refreshKey);
  const { selectedChild } = family;
  const className = useClassName(selectedChild?.schoolId, selectedChild?.classId);
  const stopRefreshing = useCallback(() => setRefreshing(false), []);
  const reports = useDayReports(selectedChild, selectedDate, refreshKey, stopRefreshing);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return { ...family, className, reports, refreshing, onRefresh };
}
