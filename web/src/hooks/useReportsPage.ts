'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import { reportHasNotesContent, reportMatchesTypeFilter, localDateIso, reportMatchesLocalDay, timestampToLocalDateIso, toIsoTimestamp } from '@/lib/reports';
import type { DailyReport, ChildGender } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export type ReportRow = DailyReport & {
  childId: string;
  childName: string;
  childClassId?: string | null;
  childGender?: ChildGender | null;
};

export type ReportsSortOrder = 'newest' | 'oldest';

export interface ReportsFiltersState {
  classId: string;
  day: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  childSearch: string;
  hasNotesOnly: boolean;
  sortOrder: ReportsSortOrder;
  limit: number;
}

const DEFAULT_FILTERS: Omit<ReportsFiltersState, 'day'> & { day?: string } = {
  classId: '',
  dateFrom: '',
  dateTo: '',
  type: '',
  childSearch: '',
  hasNotesOnly: false,
  sortOrder: 'newest',
  limit: 0,
};

function getDefaultDay(): string {
  return localDateIso();
}

const LIMIT_OPTIONS = [50, 100, 250, 500, 1000, 0] as const; // 0 = no limit

export interface UseReportsPageResult {
  reports: ReportRow[];
  classes: ClassRoom[];
  filteredReports: ReportRow[];
  loading: boolean;
  filters: ReportsFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<ReportsFiltersState>>;
  clearFilters: () => void;
  setFilterClassId: (v: string) => void;
  setFilterDay: (v: string) => void;
  setFilterDateFrom: (v: string) => void;
  setFilterDateTo: (v: string) => void;
  setFilterType: (v: string) => void;
  setChildSearch: (v: string) => void;
  setHasNotesOnly: (v: boolean) => void;
  setSortOrder: (v: ReportsSortOrder) => void;
  setLimit: (v: number) => void;
  classDisplay: (id: string) => string;
  limitOptions: readonly number[];
  refetch: () => Promise<void>;
}

export function useReportsPage(schoolId: string | undefined): UseReportsPageResult {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportsFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    day: getDefaultDay(),
  }));

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [childrenSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, 'schools', schoolId, 'children')),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);
      const list: ReportRow[] = [];
      for (const childDoc of childrenSnap.docs) {
        const childData = childDoc.data() as {
          name?: string;
          classId?: string | null;
          gender?: ChildGender;
        };
        const name = childData.name ?? childDoc.id;
        const reportsSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', childDoc.id, 'reports'),
            orderBy('timestamp', 'desc')
          )
        );
        reportsSnap.docs.forEach((r) => {
          const reportData = r.data();
          list.push({
            id: r.id,
            ...reportData,
            timestamp: toIsoTimestamp(reportData.timestamp) || toIsoTimestamp(reportData.createdAt),
            childId: childDoc.id,
            childName: name,
            childClassId: childData.classId ?? null,
            childGender: childData.gender ?? null,
          } as ReportRow);
        });
      }
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setReports(list);
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    load();
  }, [schoolId, load]);

  const filteredReports = useMemo(() => {
    let result = reports.filter((r) => {
      if (filters.classId && r.childClassId !== filters.classId) return false;
      if (filters.type && !reportMatchesTypeFilter(r, filters.type)) return false;
      if (filters.childSearch.trim()) {
        const search = filters.childSearch.trim().toLowerCase();
        if (!r.childName?.toLowerCase().includes(search)) return false;
      }
      if (filters.hasNotesOnly && !reportHasNotesContent(r)) return false;
      const ts = r.timestamp ?? '';
      if (filters.day) {
        if (!reportMatchesLocalDay(ts, filters.day)) return false;
      } else {
        const localDay = timestampToLocalDateIso(ts);
        if (filters.dateFrom && localDay < filters.dateFrom) return false;
        if (filters.dateTo && localDay > filters.dateTo) return false;
      }
      return true;
    });
    if (filters.sortOrder === 'oldest') {
      result = [...result].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    }
    if (filters.limit > 0) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }, [reports, filters]);

  const classDisplay = useCallback(
    (id: string) => formatClassDisplay(classes.find((c) => c.id === id)) || id,
    [classes]
  );

  const setFilterClassId = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, classId: v }));
  }, []);
  const setFilterDay = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, day: v, dateFrom: '', dateTo: '' }));
  }, []);
  const setFilterDateFrom = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, dateFrom: v, day: '' }));
  }, []);
  const setFilterDateTo = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, dateTo: v, day: '' }));
  }, []);
  const setFilterType = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, type: v }));
  }, []);
  const setChildSearch = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, childSearch: v }));
  }, []);
  const setHasNotesOnly = useCallback((v: boolean) => {
    setFilters((prev) => ({ ...prev, hasNotesOnly: v }));
  }, []);
  const setSortOrder = useCallback((v: ReportsSortOrder) => {
    setFilters((prev) => ({ ...prev, sortOrder: v }));
  }, []);
  const setLimit = useCallback((v: number) => {
    setFilters((prev) => ({ ...prev, limit: v }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      day: getDefaultDay(),
    });
  }, []);

  return {
    reports,
    classes,
    filteredReports,
    loading,
    filters,
    setFilters,
    clearFilters,
    setFilterClassId,
    setFilterDay,
    setFilterDateFrom,
    setFilterDateTo,
    setFilterType,
    setChildSearch,
    setHasNotesOnly,
    setSortOrder,
    setLimit,
    classDisplay,
    limitOptions: LIMIT_OPTIONS,
    refetch: load,
  };
}
