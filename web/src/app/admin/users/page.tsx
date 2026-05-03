'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { requestPasswordResetEmail } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddSuperAdminForm, type AddSuperAdminFormState } from './components/AddSuperAdminForm';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

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

const INITIAL_INVITE_FORM = { email: '', displayName: '' };

function getCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  if (err && typeof err === 'object' && 'details' in err) return String((err as { details: unknown }).details);
  return 'Something went wrong';
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const [schools, setSchools] = useState<SchoolUserCount[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddSuperAdminFormState>(INITIAL_ADD_FORM);
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ token: string; expiresAt: string } | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<SuperAdminUser | null>(null);
  const [passwordResetLoadingUid, setPasswordResetLoadingUid] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);
  const [pendingRemoveSuperAdmin, setPendingRemoveSuperAdmin] = useState<SuperAdminUser | null>(null);
  const [removeSuperAdminLoadingUid, setRemoveSuperAdminLoadingUid] = useState<string | null>(null);
  const [removeSuperAdminError, setRemoveSuperAdminError] = useState('');
  const [removeSuperAdminSuccess, setRemoveSuperAdminSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const [schoolsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'users')),
      ]);
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as { uid: string; schoolId?: string; role?: string; email?: string; displayName?: string }));

      const admins = users.filter((u) => u.role === 'super_admin') as SuperAdminUser[];
      setSuperAdmins(admins);

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
    setShowInviteForm(false);
    setInviteResult(null);
    setInviteError('');
    setShowAddForm(true);
  }, []);

  const openInviteForm = useCallback(() => {
    setShowAddForm(false);
    setAddError('');
    setInviteForm(INITIAL_INVITE_FORM);
    setInviteResult(null);
    setInviteError('');
    setShowInviteForm(true);
  }, []);

  const sendAdminInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteError('');
      setInviteResult(null);
      const emailTrim = inviteForm.email.trim().toLowerCase();
      if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        setInviteError('A valid email is required.');
        return;
      }
      setInviteSubmitting(true);
      try {
        const fn = httpsCallable<
          { email: string; displayName?: string },
          { token: string; expiresAt: string }
        >(getFunctions(app), 'adminInviteSuperAdmin');
        const res = await fn({
          email: emailTrim,
          displayName: inviteForm.displayName.trim() || undefined,
        });
        setInviteResult({ token: res.data.token, expiresAt: res.data.expiresAt });
        setInviteForm(INITIAL_INVITE_FORM);
      } catch (err: unknown) {
        setInviteError(getCallableErrorMessage(err));
      } finally {
        setInviteSubmitting(false);
      }
    },
    [inviteForm.email, inviteForm.displayName]
  );

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

  const handleRemoveSuperAdmin = useCallback(
    async (target: SuperAdminUser) => {
      setRemoveSuperAdminError('');
      setRemoveSuperAdminSuccess(false);
      setPendingRemoveSuperAdmin(null);
      setRemoveSuperAdminLoadingUid(target.uid);
      try {
        const fn = httpsCallable<{ superAdminUid: string }, { ok: boolean }>(getFunctions(app), 'removeSuperAdmin');
        await fn({ superAdminUid: target.uid });
        await load();
        setRemoveSuperAdminSuccess(true);
        window.setTimeout(() => setRemoveSuperAdminSuccess(false), 5000);
      } catch (err: unknown) {
        setRemoveSuperAdminError(getCallableErrorMessage(err));
      } finally {
        setRemoveSuperAdminLoadingUid(null);
      }
    },
    [load]
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
    <div className="animate-fade-in">
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
      <ConfirmDialog
        open={!!pendingRemoveSuperAdmin}
        onClose={() => setPendingRemoveSuperAdmin(null)}
        title="Remove super administrator?"
        message={
          pendingRemoveSuperAdmin
            ? `${pendingRemoveSuperAdmin.email} will permanently lose admin access and their sign-in will be deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove administrator"
        onConfirm={() =>
          pendingRemoveSuperAdmin &&
          handleRemoveSuperAdmin(pendingRemoveSuperAdmin)
        }
        confirmDisabled={!!removeSuperAdminLoadingUid}
      />
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Users</span>}
        subtitle="Invite administrators by email, or overview users by school below."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                openInviteForm();
              }}
              className="btn-primary"
            >
              Invite super admin
            </button>
            <button
              type="button"
              onClick={() => {
                openAddForm();
              }}
              className="btn-secondary"
            >
              Add super admin
            </button>
          </div>
        }
      />

      {showInviteForm && (
        <SectionCard topBar="accent" className="mb-6">
          <form onSubmit={sendAdminInvite}>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">Invite super admin</h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Sends an email with a secure link — same flow as inviting a school principal. They set their password on first
              open, then join the Admin console.
            </p>
            {inviteError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
            {inviteResult && (
              <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
                <p className="font-semibold">Invite sent.</p>
                <p className="mt-1">
                  Expires at: <span className="font-mono">{inviteResult.expiresAt}</span>
                </p>
                <p className="mt-2 text-green-700/90 dark:text-green-300/90">
                  Track status under Admin →{' '}
                  <Link href="/admin/invites" className="underline">
                    Invites
                  </Link>
                  .
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="admin@school.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name (optional)</label>
                <input
                  type="text"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. Jane Smith"
                  autoComplete="name"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={inviteSubmitting} className="btn-primary">
                {inviteSubmitting ? 'Sending…' : 'Send invite'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteResult(null);
                  setInviteError('');
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {showAddForm && (
        <SectionCard topBar="primary" className="mb-6">
          <AddSuperAdminForm
          form={addForm}
          setForm={setAddForm}
          error={addError}
          submitting={addSubmitting}
          onSubmit={handleAddSuperAdmin}
          onCancel={() => {
            setShowAddForm(false);
          }}
        />
        </SectionCard>
      )}

      {removeSuperAdminError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          <span className="flex items-center justify-between gap-2">
            {removeSuperAdminError}
            <button type="button" onClick={() => setRemoveSuperAdminError('')} className="shrink-0 underline">
              Dismiss
            </button>
          </span>
        </div>
      )}
      {removeSuperAdminSuccess && (
        <div
          className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
        >
          <span className="flex items-center justify-between gap-2">
            Super administrator removed.
            <button type="button" onClick={() => setRemoveSuperAdminSuccess(false)} className="shrink-0 underline">
              Dismiss
            </button>
          </span>
        </div>
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

      {(superAdmins.length > 0 || showAddForm || showInviteForm) && (
        <SectionCard topBar="warm" padding="default" className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Super admins</span>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{superAdmins.length}</p>
            </div>
          </div>
        </SectionCard>
      )}

      {superAdmins.length > 0 && (
        <SectionCard topBar="primary" padding="none" className="mb-6">
          <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            Super admins
          </h2>
          <table className="data-table">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Display name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
                <th className="min-w-[12rem] px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {superAdmins.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => u.email && setPendingPasswordReset(u)}
                        disabled={
                          !!passwordResetLoadingUid ||
                          !!removeSuperAdminLoadingUid ||
                          !u.email
                        }
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        title="Send password reset email"
                      >
                        {passwordResetLoadingUid === u.uid ? 'Sending…' : 'Reset password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemoveSuperAdmin(u)}
                        disabled={
                          superAdmins.length < 2 ||
                          u.uid === authUser?.uid ||
                          !!removeSuperAdminLoadingUid ||
                          !!passwordResetLoadingUid
                        }
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
                        title={
                          superAdmins.length < 2
                            ? 'Cannot remove the only super administrator'
                            : u.uid === authUser?.uid
                              ? 'You cannot remove your own administrator account'
                              : 'Remove administrator'
                        }
                      >
                        {removeSuperAdminLoadingUid === u.uid ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton rows={6} cols={3} />
        </SectionCard>
      ) : (
        <SectionCard topBar="accent" padding="none">
          <table className="data-table">
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
            <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>
          )}
        </SectionCard>
      )}
    </div>
  );
}
