import Link from 'next/link';
import type { School, SchoolDeletionJob } from 'shared/types';

type Props = {
  school: School;
  deletionJob: SchoolDeletionJob | null;
  dangerBusy: boolean;
  purgeNameInput: string;
  onPurgeNameChange: (value: string) => void;
  onCancelJob: () => void;
  onQueue: () => void;
};

export function DeletionPanel({ school, deletionJob, dangerBusy, purgeNameInput, onPurgeNameChange, onCancelJob, onQueue }: Props) {
  const purgeNameMatches = purgeNameInput.trim() === school.name.trim();
  const deletionPending = deletionJob?.status === 'pending';
  const deletionProcessing = deletionJob?.status === 'processing';
  return (
    <div className="relative rounded-xl border-2 border-red-200 bg-red-50/25 dark:border-red-900/60 dark:bg-red-950/25">
      <div
        className="absolute inset-y-3 left-0 w-1 rounded-full bg-red-600 dark:bg-red-500"
        aria-hidden
      />
      <div className="p-5 pl-7">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
              Scheduled permanent deletion
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              Queue wiping all school data (7 business days)
            </h3>
          </div>
          <span className="mt-2 inline-flex w-fit items-center rounded-full border border-red-300/90 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-800 shadow-sm dark:border-red-700 dark:bg-red-950/60 dark:text-red-200 sm:mt-0">
            Runs after cooldown
          </span>
        </div>
        {deletionProcessing ? (
          <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-100">
            A deletion job is <span className="text-red-700 dark:text-red-300">in progress</span> for this school. Refresh
            <Link href="/admin/school-deletions" className="mx-1 text-primary-600 underline dark:text-primary-400">
              Scheduled deletions
            </Link>
            for status.
          </p>
        ) : deletionPending && deletionJob ? (
          <>
            <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
              Removal is queued for{' '}
              <time dateTime={deletionJob.scheduledDeleteAt} className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {new Date(deletionJob.scheduledDeleteAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>{' '}
              (UTC calendar: seven business weekdays from request). Until then data remains in Firestore; the school stays
              suspended.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Job id <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-700">{deletionJob.id}</code>
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={dangerBusy}
                onClick={onCancelJob}
                className="btn-secondary disabled:opacity-50"
              >
                Cancel deletion job
              </button>
              <Link href="/admin/school-deletions" className="btn-primary inline-flex items-center justify-center no-underline">
                View deletion queue
              </Link>
            </div>
          </>
        ) : (
          <>
            <ul className="mt-4 max-w-2xl list-none space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-500" aria-hidden />
                <span>
                  Immediately suspends this school (same net effect as “Suspend”), then wipes data when the queued date is
                  reached.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-500" aria-hidden />
                <span>Removes classes, children, reports, chats, announcements, QR sets, slug mapping, and invites.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-500" aria-hidden />
                <span>Unlinks principals, teachers, and parents from this school; Auth accounts remain.</span>
              </li>
            </ul>
            <label
              htmlFor="purge-school-name"
              className="mt-5 block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Type the exact school name to queue deletion
            </label>
            <input
              id="purge-school-name"
              type="text"
              value={purgeNameInput}
              onChange={(e) => onPurgeNameChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={school.name}
              className="input-base mt-2 max-w-md"
              aria-invalid={purgeNameInput.length > 0 && !purgeNameMatches}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              {purgeNameMatches ? (
                <span className="text-emerald-700 dark:text-emerald-400">Name matches — you can continue.</span>
              ) : (
                'Copy must match punctuation and spelling exactly.'
              )}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <button
                type="button"
                disabled={dangerBusy || !purgeNameMatches}
                onClick={onQueue}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Schedule deletion…
              </button>
              <div className="max-w-md space-y-1 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                <p>Track pending and completed wipes on Scheduled deletions in the sidebar.</p>
                <p>External backups outside Firestore are not modified.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
