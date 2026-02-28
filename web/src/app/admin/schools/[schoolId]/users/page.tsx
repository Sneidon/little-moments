'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { requestPasswordResetEmail } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { UserProfile } from 'shared/types';

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
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
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
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to Users
        </Link>
        <Link
          href={`/admin/schools/${schoolId}`}
          className="ml-4 text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          Back to {schoolName || 'school'}
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Users
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {schoolName || 'School'} — staff and principals
        </p>
      </div>

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

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Role</th>
                <th className="w-0 px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {u.preferredName ?? u.displayName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.role === 'principal'
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {(u.role === 'principal' || u.role === 'teacher') && u.email ? (
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
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
            No users (principals or teachers) for this school.
          </p>
        )}
      </div>
    </div>
  );
}
