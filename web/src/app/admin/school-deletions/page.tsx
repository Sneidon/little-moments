'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { SchoolDeletionJob, SchoolDeletionJobStatus } from 'shared/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHero, SectionCard } from '@/components/ui';
import { adminCancelSchoolDeletion } from '@/services/adminSchool';
import { getCallableErrorMessage } from '@/services/parents';

function fmt(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function statusTone(s: SchoolDeletionJobStatus): string {
  switch (s) {
    case 'pending':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/45 dark:text-amber-100';
    case 'processing':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-900/45 dark:text-sky-100';
    case 'completed':
      return 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100';
    case 'cancelled':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    case 'failed':
      return 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function SchoolDeletionsAdminPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [pending, setPending] = useState<SchoolDeletionJob[]>([]);
  const [history, setHistory] = useState<SchoolDeletionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<SchoolDeletionJob | null>(null);

  useEffect(() => {
    setLoading(true);
    setSubscribeError(null);
    const qPending = query(
      collection(db, 'schoolDeletionJobs'),
      where('status', '==', 'pending'),
      orderBy('scheduledDeleteAt', 'asc')
    );
    const unsubP = onSnapshot(
      qPending,
      (snap) => {
        setPending(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SchoolDeletionJob, 'id'>),
          }))
        );
        setLoading(false);
      },
      (e) => {
        setSubscribeError(e.message);
        setLoading(false);
      }
    );

    const qHist = query(
      collection(db, 'schoolDeletionJobs'),
      where('status', 'in', ['completed', 'cancelled', 'failed']),
      orderBy('resolvedAt', 'desc'),
      limit(200)
    );
    const unsubH = onSnapshot(
      qHist,
      (snap) => {
        setHistory(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SchoolDeletionJob, 'id'>),
          }))
        );
      },
      (e) => {
        setSubscribeError((prev) => prev ?? e.message);
      }
    );

    return () => {
      unsubP();
      unsubH();
    };
  }, []);

  const handleConfirmCancel = async () => {
    if (!confirmCancel?.id) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await adminCancelSchoolDeletion({ jobId: confirmCancel.id });
      setConfirmCancel(null);
    } catch (e) {
      setActionError(getCallableErrorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        backHref="/admin/schools"
        backLabel="Schools"
        title={<span className="text-gradient-warm">School deletion queue</span>}
        subtitle="Pending wipes run after seven business days (UTC Mon–Fri). History keeps recent outcomes."
      />

      <ConfirmDialog
        open={!!confirmCancel}
        onClose={() => !actionBusy && setConfirmCancel(null)}
        title="Cancel scheduled deletion?"
        message={
          confirmCancel
            ? `Stop removal for "${confirmCancel.schoolName}" (${confirmCancel.id}) and re-open the school if it still exists.`
            : ''
        }
        confirmLabel="Cancel job"
        cancelLabel="Keep scheduled"
        confirmDisabled={actionBusy}
        onConfirm={() => void handleConfirmCancel()}
      />

      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-600">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            tab === 'pending'
              ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            tab === 'history'
              ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          Completed &amp; cancelled
        </button>
      </div>

      {subscribeError ? (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100">
          {subscribeError}
        </div>
      ) : null}
      {actionError ? (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className="mb-8 flex items-center justify-center gap-3 py-10 text-sm text-slate-500 dark:text-slate-400" role="status">
          <span
            className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600 dark:border-slate-600 dark:border-t-primary-400"
            aria-hidden
          />
          Loading queue…
        </div>
      ) : null}

      {!loading && tab === 'pending' ? (
        <SectionCard topBar="primary" padding="default">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nothing in the deletion queue right now.
            </p>
          ) : (
            <>
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                Rows are executed automatically when the processor runs (typically within 30 minutes of the scheduled timestamp).
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
                <table className="data-table min-w-[760px] w-full">
                  <thead>
                    <tr>
                      <th scope="col">School</th>
                      <th scope="col">Requested</th>
                      <th scope="col">Scheduled delete</th>
                      <th scope="col">By</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className="cell-main">{job.schoolName}</div>
                          <Link
                            href={`/admin/schools/${job.schoolId}`}
                            className="text-xs text-primary-600 underline dark:text-primary-400"
                          >
                            Overview
                          </Link>
                          <span className="mt-1 block font-mono text-[11px] text-slate-500 dark:text-slate-400">{job.id}</span>
                        </td>
                        <td className="tabular-nums text-sm">{fmt(job.requestedAt)}</td>
                        <td className="tabular-nums text-sm font-medium">{fmt(job.scheduledDeleteAt)}</td>
                        <td className="text-sm">
                          <div className="cell-muted max-w-[12rem] truncate" title={job.requestedByEmail ?? undefined}>
                            {job.requestedByEmail ?? job.requestedByUid}
                          </div>
                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone('pending')}`}>
                            Pending
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => setConfirmCancel(job)}
                            className="btn-secondary text-xs py-2 disabled:opacity-50"
                          >
                            Cancel job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      ) : !loading ? (
        <SectionCard topBar="accent" padding="default">
          {history.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No completed rows in the last retrieval window.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
              <table className="data-table min-w-[760px] w-full">
                <thead>
                  <tr>
                    <th scope="col">Outcome</th>
                    <th scope="col">School</th>
                    <th scope="col">Scheduled for</th>
                    <th scope="col">Resolved</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusTone(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        <div className="cell-main">{job.schoolName}</div>
                        <span className="font-mono text-[11px] text-slate-500">{job.schoolId}</span>
                      </td>
                      <td className="tabular-nums text-sm">{fmt(job.scheduledDeleteAt)}</td>
                      <td className="tabular-nums text-sm">{fmt(job.resolvedAt)}</td>
                      <td className="max-w-xs text-xs text-slate-600 dark:text-slate-400">
                        {job.status === 'failed' && job.errorMessage ? (
                          <span className="text-red-700 dark:text-red-300">{job.errorMessage}</span>
                        ) : job.status === 'cancelled' ? (
                          <>Cancelled manually before the purge ran.</>
                        ) : (
                          <>—</>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
