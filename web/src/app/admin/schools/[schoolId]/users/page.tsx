'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { requestPasswordResetEmail } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingScreen } from '@/components/LoadingScreen';
import { InviteSchoolAdminForm } from '@/app/principal/staff/components/InviteSchoolAdminForm';
import type { InviteSchoolAdminFormState } from '@/hooks/useStaffPage';
import { userHoldsRole } from '@/lib/roles';
import type { UserProfile } from 'shared/types';
import { PageHero, SectionCard } from '@/components/ui';

function getCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  return 'Something went wrong';
}

export default function AdminSchoolUsersPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const [schoolName, setSchoolName] = useState<string>('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<UserProfile | null>(null);
  const [passwordResetLoadingUid, setPasswordResetLoadingUid] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteSchoolAdminFormState>({
    principalEmail: '',
    principalName: '',
  });
  const [inviteError, setInviteError] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ expiresAt: string } | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [schoolSnap, usersSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      ]);
      if (!schoolSnap.exists()) {
        setError('School not found');
        return;
      }
      setSchoolName((schoolSnap.data() as { name?: string }).name ?? schoolId);
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setError(null);
    load().finally(() => setLoading(false));
  }, [schoolId, load]);

  const handleRequestPasswordReset = useCallback(async (user: UserProfile) => {
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

  const handleInviteSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setInviteError('');
    if (!inviteForm.principalEmail.trim()) {
      setInviteError('Email is required.');
      return;
    }
    setInviteSubmitting(true);
    try {
      const fn = httpsCallable<
        { schoolId: string; principalEmail: string; principalName?: string },
        { expiresAt?: string }
      >(getFunctions(app), 'inviteSchoolPrincipal');
      const res = await fn({
        schoolId,
        principalEmail: inviteForm.principalEmail.trim(),
        principalName: inviteForm.principalName.trim() || undefined,
      });
      setInviteResult({ expiresAt: res.data.expiresAt || '' });
      setInviteForm({ principalEmail: '', principalName: '' });
    } catch (err: unknown) {
      setInviteError(getCallableErrorMessage(err));
    } finally {
      setInviteSubmitting(false);
    }
  };

  if (!schoolId) return null;

  if (loading && !schoolName && !error) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/users"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to Users
        </Link>
        <div className="mt-6 rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

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
      />
      <PageHero
        variant="full"
        backHref={`/admin/schools/${schoolId}`}
        backLabel={schoolName || 'school'}
        title={<span className="text-gradient-warm">Users</span>}
        subtitle={`${schoolName || 'School'} — staff and school admins`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowInviteAdmin(true);
                setInviteError('');
                setInviteResult(null);
              }}
              className="btn-primary"
            >
              Invite school admin
            </button>
            <Link href="/admin/users" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
              All users
            </Link>
          </div>
        }
      />

      {showInviteAdmin && (
        <InviteSchoolAdminForm
          form={inviteForm}
          setForm={setInviteForm}
          error={inviteError}
          submitting={inviteSubmitting}
          inviteResult={inviteResult}
          onSubmit={handleInviteSchoolAdmin}
          onCancel={() => {
            setShowInviteAdmin(false);
            setInviteError('');
            setInviteResult(null);
            setInviteForm({ principalEmail: '', principalName: '' });
          }}
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

      <SectionCard topBar="accent" padding="none">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Role</th>
                <th className="w-0 px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isPrincipal = userHoldsRole(u, 'principal');
                const isTeacher = userHoldsRole(u, 'teacher');
                const roleLabel = [
                  isPrincipal ? 'school admin' : null,
                  isTeacher ? 'teacher' : null,
                  !isPrincipal && !isTeacher ? u.role : null,
                ]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {u.preferredName ?? u.displayName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          isPrincipal
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {(isPrincipal || isTeacher) && u.email ? (
                        <button
                          type="button"
                          onClick={() => setPendingPasswordReset(u)}
                          disabled={!!passwordResetLoadingUid}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          title="Send password reset email"
                        >
                          {passwordResetLoadingUid === u.uid ? 'Sending…' : 'Reset password'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
            No users (school admins or teachers) for this school.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
