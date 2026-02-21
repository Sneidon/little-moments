'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportStaffPageToPdf, type StaffRowForPdf } from '@/lib/exportStaffPagePdf';
import { exportStaffPageToCsv } from '@/lib/exportStaffPageCsv';
import { exportStaffPageToExcel } from '@/lib/exportStaffPageExcel';
import { requestPasswordResetEmail } from '@/lib/auth';
import type { UserProfile } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export type StaffRoleFilter = 'all' | 'principal' | 'teacher';

export interface AddTeacherFormState {
  teacherEmail: string;
  teacherDisplayName: string;
  teacherPreferredName: string;
  teacherPassword: string;
}

export interface EditTeacherFormState {
  displayName: string;
  preferredName: string;
  isActive: boolean;
}

const INITIAL_ADD_FORM: AddTeacherFormState = {
  teacherEmail: '',
  teacherDisplayName: '',
  teacherPreferredName: '',
  teacherPassword: '',
};

const getEditFormState = (u: UserProfile): EditTeacherFormState => ({
  displayName: u.displayName ?? '',
  preferredName: u.preferredName ?? '',
  isActive: u.isActive !== false,
});

function getCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  if (err && typeof err === 'object' && 'details' in err) return String((err as { details: unknown }).details);
  return 'Something went wrong';
}

export interface UseStaffPageResult {
  loading: boolean;
  schoolName: string;
  staffMembers: UserProfile[];
  filteredStaff: UserProfile[];
  classes: ClassRoom[];
  classForTeacher: (uid: string) => string | undefined;
  formatDate: (s: string | undefined) => string;
  staffRoleFilter: StaffRoleFilter;
  setStaffRoleFilter: (v: StaffRoleFilter) => void;
  staffSearch: string;
  setStaffSearch: (v: string) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  addForm: AddTeacherFormState;
  setAddForm: React.Dispatch<React.SetStateAction<AddTeacherFormState>>;
  addTeacherError: string;
  addTeacherSubmitting: boolean;
  handleAddTeacher: (e: React.FormEvent) => Promise<void>;
  openAddForm: () => void;
  editingUid: string | null;
  editForm: EditTeacherFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditTeacherFormState>>;
  editError: string;
  editSubmitting: boolean;
  startEditTeacher: (u: UserProfile) => void;
  handleUpdateTeacher: (e: React.FormEvent) => Promise<void>;
  cancelEditTeacher: () => void;
  handleExportPdf: () => void;
  handleExportCsv: () => void;
  handleExportExcel: () => void;
  refetch: () => Promise<void>;
  passwordResetLoadingUid: string | null;
  passwordResetError: string;
  passwordResetSuccess: string | null;
  handleRequestPasswordReset: (user: UserProfile) => Promise<void>;
  clearPasswordResetFeedback: () => void;
}

export function useStaffPage(): UseStaffPageResult {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffRoleFilter, setStaffRoleFilter] = useState<StaffRoleFilter>('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddTeacherFormState>(INITIAL_ADD_FORM);
  const [addTeacherError, setAddTeacherError] = useState('');
  const [addTeacherSubmitting, setAddTeacherSubmitting] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditTeacherFormState>({
    displayName: '',
    preferredName: '',
    isActive: true,
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [passwordResetLoadingUid, setPasswordResetLoadingUid] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const [usersSnap, classesSnap, schoolSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      getDocs(collection(db, 'schools', schoolId, 'classes')),
      getDoc(doc(db, 'schools', schoolId)),
    ]);
    setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
    setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
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

  const staffMembers = useMemo(
    () => users.filter((u) => u.role === 'teacher' || u.role === 'principal'),
    [users]
  );

  const classForTeacher = useCallback(
    (uid: string) => formatClassDisplay(classes.find((c) => c.assignedTeacherId === uid)),
    [classes]
  );

  const filteredStaff = useMemo(() => {
    let list = staffMembers;
    if (staffRoleFilter === 'principal') list = list.filter((u) => u.role === 'principal');
    else if (staffRoleFilter === 'teacher') list = list.filter((u) => u.role === 'teacher');
    if (staffSearch.trim()) {
      const q = staffSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.displayName ?? '').toLowerCase().includes(q) ||
          (u.preferredName ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [staffMembers, staffRoleFilter, staffSearch]);

  const formatDate = useCallback(
    (s: string | undefined) =>
      s ? new Date(s).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—',
    []
  );

  const openAddForm = useCallback(() => {
    setAddTeacherError('');
    setAddForm(INITIAL_ADD_FORM);
    setShowAddForm(true);
  }, []);

  const handleAddTeacher = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddTeacherError('');
      if (!addForm.teacherEmail?.trim() || !addForm.teacherPassword || addForm.teacherPassword.length < 6) {
        setAddTeacherError('Email and password (min 6 characters) are required.');
        return;
      }
      setAddTeacherSubmitting(true);
      try {
        const functions = getFunctions(app);
        const createTeacherFn = httpsCallable<
          { teacherEmail: string; teacherDisplayName?: string; teacherPreferredName?: string; teacherPassword: string },
          { teacherUid: string }
        >(functions, 'createTeacher');
        await createTeacherFn({
          teacherEmail: addForm.teacherEmail.trim(),
          teacherDisplayName: addForm.teacherDisplayName.trim() || undefined,
          teacherPreferredName: addForm.teacherPreferredName.trim() || undefined,
          teacherPassword: addForm.teacherPassword,
        });
        await load();
        setAddForm(INITIAL_ADD_FORM);
        setShowAddForm(false);
      } catch (err: unknown) {
        setAddTeacherError(getCallableErrorMessage(err));
      } finally {
        setAddTeacherSubmitting(false);
      }
    },
    [addForm, load]
  );

  const startEditTeacher = useCallback((u: UserProfile) => {
    if (u.role === 'principal') return;
    setEditingUid(u.uid);
    setEditError('');
    setEditForm(getEditFormState(u));
  }, []);

  const handleUpdateTeacher = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUid) return;
      setEditError('');
      setEditSubmitting(true);
      try {
        const functions = getFunctions(app);
        const updateTeacherFn = httpsCallable<
          { teacherUid: string; displayName?: string; preferredName?: string; isActive?: boolean },
          { ok: boolean }
        >(functions, 'updateTeacher');
        await updateTeacherFn({
          teacherUid: editingUid,
          displayName: editForm.displayName.trim() || undefined,
          preferredName: editForm.preferredName.trim() || undefined,
          isActive: editForm.isActive,
        });
        await load();
        setEditingUid(null);
      } catch (err: unknown) {
        setEditError(getCallableErrorMessage(err));
      } finally {
        setEditSubmitting(false);
      }
    },
    [editingUid, editForm, load]
  );

  const cancelEditTeacher = useCallback(() => {
    setEditingUid(null);
    setEditError('');
  }, []);

  const staffForExport: StaffRowForPdf[] = useMemo(
    () =>
      filteredStaff.map((u) => ({
        ...u,
        assignedClass: classForTeacher(u.uid) ?? undefined,
      })),
    [filteredStaff, classForTeacher]
  );

  const handleExportPdf = useCallback(() => {
    exportStaffPageToPdf({
      schoolName: schoolName || undefined,
      staff: staffForExport,
      include: { staff: true, parents: false },
    });
  }, [schoolName, staffForExport]);

  const handleExportCsv = useCallback(() => {
    exportStaffPageToCsv({
      schoolName: schoolName || undefined,
      staff: staffForExport,
      include: { staff: true, parents: false },
    });
  }, [schoolName, staffForExport]);

  const handleExportExcel = useCallback(() => {
    exportStaffPageToExcel({
      schoolName: schoolName || undefined,
      staff: staffForExport,
      include: { staff: true, parents: false },
    });
  }, [schoolName, staffForExport]);

  const handleRequestPasswordReset = useCallback(async (user: UserProfile) => {
    const email = user.email?.trim();
    if (!email) return;
    setPasswordResetError('');
    setPasswordResetSuccess(null);
    setPasswordResetLoadingUid(user.uid);
    try {
      await requestPasswordResetEmail(email);
      setPasswordResetSuccess(email);
      setPasswordResetError('');
      setTimeout(() => setPasswordResetSuccess(null), 5000);
    } catch (err: unknown) {
      setPasswordResetError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setPasswordResetLoadingUid(null);
    }
  }, []);

  const clearPasswordResetFeedback = useCallback(() => {
    setPasswordResetError('');
    setPasswordResetSuccess(null);
  }, []);

  return {
    loading,
    schoolName,
    staffMembers,
    filteredStaff,
    classes,
    classForTeacher,
    formatDate,
    staffRoleFilter,
    setStaffRoleFilter,
    staffSearch,
    setStaffSearch,
    showAddForm,
    setShowAddForm,
    addForm,
    setAddForm,
    addTeacherError,
    addTeacherSubmitting,
    handleAddTeacher,
    openAddForm,
    editingUid,
    editForm,
    setEditForm,
    editError,
    editSubmitting,
    startEditTeacher,
    handleUpdateTeacher,
    cancelEditTeacher,
    handleExportPdf,
    handleExportCsv,
    handleExportExcel,
    refetch,
    passwordResetLoadingUid,
    passwordResetError,
    passwordResetSuccess,
    handleRequestPasswordReset,
    clearPasswordResetFeedback,
  };
}
