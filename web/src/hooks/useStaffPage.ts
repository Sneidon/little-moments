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
import { userHoldsRole } from '@/lib/roles';

export type StaffRoleFilter = 'all' | 'principal' | 'teacher';

export interface AddTeacherFormState {
  teacherEmail: string;
  teacherDisplayName: string;
  teacherPreferredName: string;
  teacherPassword: string;
}

export interface InviteTeacherFormState {
  teacherEmail: string;
  teacherDisplayName: string;
  teacherPreferredName: string;
}

export interface InviteSchoolAdminFormState {
  principalEmail: string;
  principalName: string;
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

const INITIAL_INVITE_TEACHER_FORM: InviteTeacherFormState = {
  teacherEmail: '',
  teacherDisplayName: '',
  teacherPreferredName: '',
};

const INITIAL_INVITE_SCHOOL_ADMIN_FORM: InviteSchoolAdminFormState = {
  principalEmail: '',
  principalName: '',
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
  resetInviteTeacherForm: () => void;
  showInviteTeacherForm: boolean;
  setShowInviteTeacherForm: React.Dispatch<React.SetStateAction<boolean>>;
  inviteTeacherForm: InviteTeacherFormState;
  setInviteTeacherForm: React.Dispatch<React.SetStateAction<InviteTeacherFormState>>;
  inviteTeacherError: string;
  inviteTeacherSubmitting: boolean;
  inviteTeacherResult: { expiresAt: string } | null;
  handleInviteTeacherByEmail: (e: React.FormEvent) => Promise<void>;
  openInviteTeacherForm: () => void;
  showInviteSchoolAdminForm: boolean;
  inviteSchoolAdminForm: InviteSchoolAdminFormState;
  setInviteSchoolAdminForm: React.Dispatch<React.SetStateAction<InviteSchoolAdminFormState>>;
  inviteSchoolAdminError: string;
  inviteSchoolAdminSubmitting: boolean;
  inviteSchoolAdminResult: { expiresAt: string } | null;
  handleInviteSchoolAdmin: (e: React.FormEvent) => Promise<void>;
  openInviteSchoolAdminForm: () => void;
  resetInviteSchoolAdminForm: () => void;
  deletingTeacherUid: string | null;
  deleteTeacherError: string;
  handleDeleteTeacher: (teacherUid: string) => Promise<boolean>;
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
  const [showInviteTeacherForm, setShowInviteTeacherForm] = useState(false);
  const [inviteTeacherForm, setInviteTeacherForm] = useState<InviteTeacherFormState>(INITIAL_INVITE_TEACHER_FORM);
  const [inviteTeacherError, setInviteTeacherError] = useState('');
  const [inviteTeacherSubmitting, setInviteTeacherSubmitting] = useState(false);
  const [inviteTeacherResult, setInviteTeacherResult] = useState<{ expiresAt: string } | null>(null);
  const [showInviteSchoolAdminForm, setShowInviteSchoolAdminForm] = useState(false);
  const [inviteSchoolAdminForm, setInviteSchoolAdminForm] = useState<InviteSchoolAdminFormState>(
    INITIAL_INVITE_SCHOOL_ADMIN_FORM
  );
  const [inviteSchoolAdminError, setInviteSchoolAdminError] = useState('');
  const [inviteSchoolAdminSubmitting, setInviteSchoolAdminSubmitting] = useState(false);
  const [inviteSchoolAdminResult, setInviteSchoolAdminResult] = useState<{ expiresAt: string } | null>(null);
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
  const [deletingTeacherUid, setDeletingTeacherUid] = useState<string | null>(null);
  const [deleteTeacherError, setDeleteTeacherError] = useState('');

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
    () => users.filter((u) => userHoldsRole(u, 'teacher') || userHoldsRole(u, 'principal')),
    [users]
  );

  const classForTeacher = useCallback(
    (uid: string) => formatClassDisplay(classes.find((c) => c.assignedTeacherId === uid)),
    [classes]
  );

  const filteredStaff = useMemo(() => {
    let list = staffMembers;
    if (staffRoleFilter === 'principal') list = list.filter((u) => userHoldsRole(u, 'principal'));
    else if (staffRoleFilter === 'teacher') list = list.filter((u) => userHoldsRole(u, 'teacher'));
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
    setShowInviteTeacherForm(false);
    setInviteTeacherError('');
    setInviteTeacherResult(null);
    setAddForm(INITIAL_ADD_FORM);
    setShowAddForm(true);
  }, []);

  const openInviteTeacherForm = useCallback(() => {
    setAddTeacherError('');
    setShowAddForm(false);
    setShowInviteSchoolAdminForm(false);
    setInviteTeacherError('');
    setInviteTeacherResult(null);
    setInviteTeacherForm(INITIAL_INVITE_TEACHER_FORM);
    setShowInviteTeacherForm(true);
  }, []);

  const openInviteSchoolAdminForm = useCallback(() => {
    setAddTeacherError('');
    setShowAddForm(false);
    setShowInviteTeacherForm(false);
    setInviteSchoolAdminError('');
    setInviteSchoolAdminResult(null);
    setInviteSchoolAdminForm(INITIAL_INVITE_SCHOOL_ADMIN_FORM);
    setShowInviteSchoolAdminForm(true);
  }, []);

  const resetInviteSchoolAdminForm = useCallback(() => {
    setInviteSchoolAdminError('');
    setInviteSchoolAdminResult(null);
    setInviteSchoolAdminForm(INITIAL_INVITE_SCHOOL_ADMIN_FORM);
    setShowInviteSchoolAdminForm(false);
  }, []);

  const handleInviteSchoolAdmin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteSchoolAdminError('');
      if (!inviteSchoolAdminForm.principalEmail?.trim()) {
        setInviteSchoolAdminError('Email is required.');
        return;
      }
      if (!profile?.schoolId) {
        setInviteSchoolAdminError('No school on your profile.');
        return;
      }
      setInviteSchoolAdminSubmitting(true);
      try {
        const fn = httpsCallable<
          { schoolId: string; principalEmail: string; principalName?: string },
          { token?: string; expiresAt?: string }
        >(getFunctions(app), 'inviteSchoolPrincipal');
        const res = await fn({
          schoolId: profile.schoolId,
          principalEmail: inviteSchoolAdminForm.principalEmail.trim(),
          principalName: inviteSchoolAdminForm.principalName.trim() || undefined,
        });
        setInviteSchoolAdminResult({ expiresAt: res.data.expiresAt || '' });
        setInviteSchoolAdminForm(INITIAL_INVITE_SCHOOL_ADMIN_FORM);
      } catch (err: unknown) {
        setInviteSchoolAdminError(getCallableErrorMessage(err));
      } finally {
        setInviteSchoolAdminSubmitting(false);
      }
    },
    [inviteSchoolAdminForm, profile?.schoolId, load]
  );

  const resetInviteTeacherForm = useCallback(() => {
    setInviteTeacherError('');
    setInviteTeacherResult(null);
    setInviteTeacherForm(INITIAL_INVITE_TEACHER_FORM);
    setShowInviteTeacherForm(false);
  }, []);

  const handleInviteTeacherByEmail = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteTeacherError('');
      if (!inviteTeacherForm.teacherEmail?.trim()) {
        setInviteTeacherError('Email is required.');
        return;
      }
      setInviteTeacherSubmitting(true);
      try {
        const fn = httpsCallable<
          {
            teacherEmail: string;
            teacherDisplayName?: string;
            teacherPreferredName?: string;
          },
          { token?: string; expiresAt?: string }
        >(getFunctions(app), 'principalInviteTeacher');
        const res = await fn({
          teacherEmail: inviteTeacherForm.teacherEmail.trim(),
          teacherDisplayName: inviteTeacherForm.teacherDisplayName.trim() || undefined,
          teacherPreferredName: inviteTeacherForm.teacherPreferredName.trim() || undefined,
        });
        setInviteTeacherResult({ expiresAt: res.data.expiresAt || '' });
        setInviteTeacherForm(INITIAL_INVITE_TEACHER_FORM);
      } catch (err: unknown) {
        setInviteTeacherError(getCallableErrorMessage(err));
      } finally {
        setInviteTeacherSubmitting(false);
      }
    },
    [inviteTeacherForm, load]
  );

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
    if (userHoldsRole(u, 'principal') && !userHoldsRole(u, 'teacher')) return;
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

  const handleDeleteTeacher = useCallback(async (teacherUid: string): Promise<boolean> => {
    setDeleteTeacherError('');
    setDeletingTeacherUid(teacherUid);
    try {
      const fn = httpsCallable<
        { teacherUid: string },
        { ok: boolean; unassignedClassCount?: number; unassignedChildCount?: number }
      >(getFunctions(app), 'principalDeleteTeacher');
      await fn({ teacherUid });
      await load();
      setEditingUid((prev) => (prev === teacherUid ? null : prev));
      return true;
    } catch (err: unknown) {
      setDeleteTeacherError(getCallableErrorMessage(err));
      return false;
    } finally {
      setDeletingTeacherUid(null);
    }
  }, [load]);

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
    resetInviteTeacherForm,
    showInviteTeacherForm,
    setShowInviteTeacherForm,
    inviteTeacherForm,
    setInviteTeacherForm,
    inviteTeacherError,
    inviteTeacherSubmitting,
    inviteTeacherResult,
    handleInviteTeacherByEmail,
    openInviteTeacherForm,
    showInviteSchoolAdminForm,
    inviteSchoolAdminForm,
    setInviteSchoolAdminForm,
    inviteSchoolAdminError,
    inviteSchoolAdminSubmitting,
    inviteSchoolAdminResult,
    handleInviteSchoolAdmin,
    openInviteSchoolAdminForm,
    resetInviteSchoolAdminForm,
    deletingTeacherUid,
    deleteTeacherError,
    handleDeleteTeacher,
  };
}
