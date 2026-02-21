'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { exportStaffPageToPdf, type ParentWithChildren } from '@/lib/exportStaffPagePdf';
import type { UserProfile } from 'shared/types';
import type { Child } from 'shared/types';

export interface UseParentsPageResult {
  loading: boolean;
  schoolName: string;
  parents: UserProfile[];
  parentsWithChildren: ParentWithChildren[];
  filteredParents: ParentWithChildren[];
  children: Child[];
  parentSearch: string;
  setParentSearch: (v: string) => void;
  parentChildFilter: string;
  setParentChildFilter: (v: string) => void;
  exportingPdf: boolean;
  handleExportPdf: () => void;
  refetch: () => Promise<void>;
}

export function useParentsPage(): UseParentsPageResult {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [parentSearch, setParentSearch] = useState('');
  const [parentChildFilter, setParentChildFilter] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const [usersSnap, childrenSnap, schoolSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      getDocs(query(collection(db, 'schools', schoolId, 'children'))),
      getDoc(doc(db, 'schools', schoolId)),
    ]);
    setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
    setChildren(childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
    if (schoolSnap.exists()) {
      const data = schoolSnap.data() as { name?: string };
      setSchoolName(data?.name ?? '');
    }
  }, [profile?.schoolId]);

  const refetch = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    if (!profile?.schoolId) return;
    load().then(() => setLoading(false));
  }, [profile?.schoolId, load]);

  const parents = useMemo(
    () => users.filter((u) => u.role === 'parent'),
    [users]
  );

  const parentsWithChildren: ParentWithChildren[] = useMemo(
    () =>
      parents.map((p) => ({
        ...p,
        children: children.filter((c) => c.parentIds?.includes(p.uid)) ?? [],
      })),
    [parents, children]
  );

  const filteredParents = useMemo(() => {
    let list = parentsWithChildren;
    if (parentChildFilter) {
      list = list.filter((p) => p.children.some((c) => c.id === parentChildFilter));
    }
    if (parentSearch.trim()) {
      const q = parentSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.displayName ?? '').toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q) ||
          (p.phone ?? '').toLowerCase().includes(q) ||
          p.children.some((c) => (c.name ?? '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [parentsWithChildren, parentChildFilter, parentSearch]);

  const handleExportPdf = useCallback(() => {
    setExportingPdf(true);
    try {
      exportStaffPageToPdf({
        schoolName: schoolName || undefined,
        parents: filteredParents,
        include: { staff: false, parents: true },
      });
    } finally {
      setExportingPdf(false);
    }
  }, [schoolName, filteredParents]);

  return {
    loading,
    schoolName,
    parents,
    parentsWithChildren,
    filteredParents,
    children,
    parentSearch,
    setParentSearch,
    parentChildFilter,
    setParentChildFilter,
    exportingPdf,
    handleExportPdf,
    refetch,
  };
}
