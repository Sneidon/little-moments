import Link from 'next/link';
import type { SchoolDeletionJob, SchoolDeletionJobStatus } from 'shared/types';

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

export function PendingJobsTable({ jobs, busy, onCancel }: { jobs: SchoolDeletionJob[]; busy: boolean; onCancel: (job: SchoolDeletionJob) => void }) {
  return (
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
          {jobs.map((job) => (
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
                  disabled={busy}
                  onClick={() => onCancel(job)}
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
  );
}

export function HistoryTable({ jobs }: { jobs: SchoolDeletionJob[] }) {
  return (
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
          {jobs.map((job) => (
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
  );
}
