'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/config/firebase';
import { app } from '@/config/firebase';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

type InviteTokenDoc = {
  id: string;
  token: string;
  schoolId?: string;
  createdSchoolId?: string;
  schoolName?: string;
  email: string;
  role: 'principal' | 'teacher';
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

function inviteStatus(invite: InviteTokenDoc): 'ACCEPTED' | 'EXPIRED' | 'PENDING' {
  if (invite.usedAt) return 'ACCEPTED';
  const expiry = new Date(invite.expiresAt).getTime();
  if (Number.isFinite(expiry) && expiry < Date.now()) return 'EXPIRED';
  return 'PENDING';
}

export default function AdminInvitesPage() {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<InviteTokenDoc[]>([]);
  const [resendingById, setResendingById] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const resendSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInvites = async () => {
    const invitesSnap = await getDocs(collection(db, 'inviteTokens'));
    const inviteRows = invitesSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<InviteTokenDoc, 'id'>) }))
      .sort((a, b) => {
        const aTs = new Date(a.createdAt).getTime();
        const bTs = new Date(b.createdAt).getTime();
        return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
      });
    setInvites(inviteRows);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadInvites();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (resendSuccessTimeoutRef.current) clearTimeout(resendSuccessTimeoutRef.current);
    };
  }, []);

  const resendInvite = async (inviteId: string) => {
    setError(null);
    setResendSuccess(null);
    if (resendSuccessTimeoutRef.current) {
      clearTimeout(resendSuccessTimeoutRef.current);
      resendSuccessTimeoutRef.current = null;
    }
    setResendingById((prev) => ({ ...prev, [inviteId]: true }));
    try {
      const fn = httpsCallable<{ inviteId: string }, { ok: boolean }>(getFunctions(app), 'resendPrincipalInvite');
      await fn({ inviteId });
      await loadInvites();
      setResendSuccess('Invitation email sent again. They will receive a new link.');
      resendSuccessTimeoutRef.current = window.setTimeout(() => {
        setResendSuccess(null);
        resendSuccessTimeoutRef.current = null;
      }, 5000);
    } catch (err: unknown) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to resend invite'
      );
    } finally {
      setResendingById((prev) => ({ ...prev, [inviteId]: false }));
    }
  };

  const totals = useMemo(() => {
    const pending = invites.filter((i) => inviteStatus(i) === 'PENDING').length;
    const accepted = invites.filter((i) => inviteStatus(i) === 'ACCEPTED').length;
    const expired = invites.filter((i) => inviteStatus(i) === 'EXPIRED').length;
    return { pending, accepted, expired, total: invites.length };
  }, [invites]);

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Principal invites</span>}
        subtitle="Track all invite links and onboarding status."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard topBar="primary" className="p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-bold">{totals.total}</p></SectionCard>
        <SectionCard topBar="accent" className="p-4"><p className="text-xs text-slate-500">Pending</p><p className="text-2xl font-bold">{totals.pending}</p></SectionCard>
        <SectionCard topBar="warm" className="p-4"><p className="text-xs text-slate-500">Accepted</p><p className="text-2xl font-bold">{totals.accepted}</p></SectionCard>
        <SectionCard topBar="accent" className="p-4"><p className="text-xs text-slate-500">Expired</p><p className="text-2xl font-bold">{totals.expired}</p></SectionCard>
      </div>
      {error && (
        <SectionCard topBar="warm" className="mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </SectionCard>
      )}
      {resendSuccess && (
        <div
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
        >
          <span className="flex items-center justify-between gap-2">
            {resendSuccess}
            <button
              type="button"
              onClick={() => {
                if (resendSuccessTimeoutRef.current) {
                  clearTimeout(resendSuccessTimeoutRef.current);
                  resendSuccessTimeoutRef.current = null;
                }
                setResendSuccess(null);
              }}
              className="shrink-0 underline"
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton rows={8} cols={7} />
        </SectionCard>
      ) : (
        <SectionCard topBar="accent" padding="none">
          <div className="overflow-hidden">
            <table className="data-table">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">School</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Principal email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const createdSchoolId = invite.createdSchoolId || invite.schoolId;
                  const status = inviteStatus(invite);
                  return (
                    <tr key={invite.id} className="border-t border-slate-100 dark:border-slate-600">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {createdSchoolId ? (
                          <Link href={`/admin/schools/${createdSchoolId}`} className="text-primary-600 hover:underline dark:text-primary-400">
                            {invite.schoolName || 'School'}
                          </Link>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-200">{invite.schoolName || 'School not created yet'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{invite.email}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 uppercase">{invite.role}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(invite.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(invite.expiresAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'ACCEPTED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : status === 'EXPIRED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status !== 'ACCEPTED' ? (
                          <button
                            type="button"
                            onClick={() => resendInvite(invite.id)}
                            disabled={Boolean(resendingById[invite.id])}
                            className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            {resendingById[invite.id] ? 'Resending…' : 'Resend'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invites.length === 0 && (
              <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                No invites yet.
              </p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

