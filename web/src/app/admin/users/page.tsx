'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { requestPasswordResetEmail } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddSuperAdminForm, type AddSuperAdminFormState } from './components/AddSuperAdminForm';

type SchoolUserCount = {
  id: string;
  name: string;
  userCount: number;
};

type SuperAdminUser = {
  uid: string;
  email: string;
  displayName?: string;
};

const INITIAL_ADD_FORM: AddSuperAdminFormState = {
  email: '',
  displayName: '',
  password: '',
};

function getCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  if (err && typeof err === 'object' && 'details' in err) return String((err as { details: unknown }).details);
  return 'Something went wrong';
}

export default function AdminUsersPage() {
  const [schools, setSchools] = useState<SchoolUserCount[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [parentCount, setParentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddSuperAdminFormState>(INITIAL_ADD_FORM);
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<SuperAdminUser | null>(null);
  const [passwordResetLoadingUid, setPasswordResetLoadingUid] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [schoolsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'users')),
      ]);
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as { uid: string; schoolId?: string; role?: string; email?: string; displayName?: string }));

      const admins = users.filter((u) => u.role === 'super_admin') as SuperAdminUser[];
      const parents = users.filter((u) => u.role === 'parent').length;
      setSuperAdmins(admins);
      setParentCount(parents);

      const list: SchoolUserCount[] = schoolsSnap.docs.map((doc) => {
        const schoolId = doc.id;
        const name = (doc.data() as { name?: string }).name ?? schoolId;
        const userCount = users.filter((u) => u.schoolId === schoolId).length;
        return { id: schoolId, name, userCount };
      });
      setSchools(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAddForm = useCallback(() => {
    setAddError('');
    setAddForm(INITIAL_ADD_FORM);
    setShowAddForm(true);
  }, []);

  const handleAddSuperAdmin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddError('');
      if (!addForm.email?.trim() || !addForm.password || addForm.password.length < 6) {
        setAddError('Email and password (min 6 characters) are required.');
        return;
      }
      setAddSubmitting(true);
      try {
        const functions = getFunctions(app);
        const createSuperAdminFn = httpsCallable<
          { email: string; displayName?: string; password: string },
          { superAdminUid: string }
        >(functions, 'createSuperAdmin');
        await createSuperAdminFn({
          email: addForm.email.trim(),
          displayName: addForm.displayName.trim() || undefined,
          password: addForm.password,
        });
        await load();
        setAddForm(INITIAL_ADD_FORM);
        setShowAddForm(false);
      } catch (err: unknown) {
        setAddError(getCallableErrorMessage(err));
      } finally {
        setAddSubmitting(false);
      }
    },
    [addForm, load]
  );

  const handleRequestPasswordReset = useCallback(async (user: SuperAdminUser) => {
    const email = user.email?.trim();
    if (!email) return;
    setPasswordResetError('');
    setPasswordResetSuccess(null);
    setPendingPasswordReset(null);
    setPasswordResetLoadingUid(user.uid);
    try {
      await requestPasswordResetEmail(email);
      setPasswordResetSuccess(email);
      setTimeout(() => setPasswordResetSuccess(null), 5000);
    } catch (err: unknown) {
      setPasswordResetError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setPasswordResetLoadingUid(null);
    }
  }, []);

  return (
    <div>
      <ConfirmDialog
        open={!!pendingPasswordReset}
        onClose={() => setPendingPasswordReset(null)}
        title="Send password reset email?"
        message={
          pendingPasswordReset
            ? `Send a password reset link to ${pendingPasswordReset.email}? They will receive an email to set a new password.`
            : ''
        }
        confirmLabel="Send reset email"
        onConfirm={() => pendingPasswordReset && handleRequestPasswordReset(pendingPasswordReset)}
        confirmDisabled={!!passwordResetLoadingUid}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Users</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Overview by school. Click a school to view and manage its users.
        </p>
      </div>

      {showAddForm && (
        <AddSuperAdminForm
          form={addForm}
          setForm={setAddForm}
          error={addError}
          submitting={addSubmitting}
          onSubmit={handleAddSuperAdmin}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {(passwordResetError || passwordResetSuccess) && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            passwordResetError
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
              : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200'
          }`}
        >
          {passwordResetError ? (
            <span className="flex items-center justify-between gap-2">
              {passwordResetError}
              <button type="button" onClick={() => setPasswordResetError('')} className="shrink-0 underline">
                Dismiss
              </button>
            </span>
          ) : (
            <span className="flex items-center justify-between gap-2">
              Password reset email sent. The user will receive a link to set a new password.
              <button type="button" onClick={() => setPasswordResetSuccess(null)} className="shrink-0 underline">
                Dismiss
              </button>
            </span>
          )}
        </div>
      )}

      {(superAdmins.length > 0 || parentCount > 0 || showAddForm) && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Super admins</span>
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{superAdmins.length}</p>
          </div>
          <div className='flex-1'></div>
          {!showAddForm && (
            <button type="button" onClick={openAddForm} className="btn-primary text-sm">
              Add super admin
            </button>
          )}
          {parentCount > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Parents (all)</span>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{parentCount}</p>
            </div>
          )}
        </div>
      )}

      {superAdmins.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            Super admins
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Display name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
                <th className="w-0 px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {superAdmins.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => u.email && setPendingPasswordReset(u)}
                      disabled={!!passwordResetLoadingUid || !u.email}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      title="Send password reset email"
                    >
                      {passwordResetLoadingUid === u.uid ? 'Sending…' : 'Reset password'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">School</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Users</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/admin/schools/${s.id}/users`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {schools.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
