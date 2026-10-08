import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { exportStaffPageToCsv, exportStaffPageToExcel } from '@/lib/export/staffPage';
import { exportStaffPageToPdf, type StaffRowForPdf } from '@/lib/export/staffPagePdf';
import { formatClassDisplay } from '@/lib/formatClass';
import { userHasRole } from '@/lib/roles';
import type { ClassRoom, UserProfile } from 'shared/types';
import type { StaffRoleFilter } from './types';

function matchesSearch(u: UserProfile, q: string) {
  return [u.displayName, u.preferredName, u.email].some((v) => (v ?? '').toLowerCase().includes(q));
}

export function useStaffRoster() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>('all');
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    if (!schoolId) return;
    const [usersSnap, classesSnap, schoolSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      getDocs(collection(db, 'schools', schoolId, 'classes')),
      getDoc(doc(db, 'schools', schoolId)),
    ]);
    setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile));
    setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassRoom));
    if (schoolSnap.exists()) setSchoolName((schoolSnap.data() as { name?: string }).name ?? '');
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) reload().then(() => setLoading(false));
  }, [schoolId, reload]);

  const staff = useMemo(() => users.filter((u) => userHasRole(u, 'teacher') || userHasRole(u, 'principal')), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((u) => (roleFilter === 'all' || userHasRole(u, roleFilter)) && (!q || matchesSearch(u, q)));
  }, [staff, roleFilter, search]);

  const classForTeacher = useCallback((uid: string) => formatClassDisplay(classes.find((c) => c.assignedTeacherId === uid)), [classes]);

  const exportOptions = () => ({
    schoolName: schoolName || undefined,
    staff: filtered.map((u): StaffRowForPdf => ({ ...u, assignedClass: classForTeacher(u.uid) ?? undefined })),
    include: { staff: true, parents: false },
  });

  return {
    schoolId,
    loading,
    staff,
    filtered,
    classForTeacher,
    roleFilter,
    setRoleFilter,
    search,
    setSearch,
    reload,
    exportPdf: () => exportStaffPageToPdf(exportOptions()),
    exportCsv: () => exportStaffPageToCsv(exportOptions()),
    exportExcel: () => exportStaffPageToExcel(exportOptions()),
  };
}
