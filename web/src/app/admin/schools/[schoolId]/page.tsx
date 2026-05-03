'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { SchoolDeletionJob } from 'shared/types';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHero, SectionCard } from '@/components/ui';
import {
  adminCancelSchoolDeletion,
  adminQueueSchoolDeletion,
  adminSetSchoolSuspended,
} from '@/services/adminSchool';
import { getCallableErrorMessage } from '@/services/parents';

export default function AdminSchoolOverviewPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, teachers, classes, children, loading, error, refetch } = useAdminSchoolDetail(schoolId);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [queueDeleteOpen, setQueueDeleteOpen] = useState(false);
  const [purgeNameInput, setPurgeNameInput] = useState('');
  const [deletionJob, setDeletionJob] = useState<SchoolDeletionJob | null>(null);
  const [cancelJobOpen, setCancelJobOpen] = useState(false);

  useEffect(() => {
    if (!schoolId) return undefined;
    const q = query(
      collection(db, 'schoolDeletionJobs'),
      where('schoolId', '==', schoolId),
      where('status', 'in', ['pending', 'processing'])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setDeletionJob(null);
          return;
        }
        const d = snap.docs[0];
        setDeletionJob({ id: d.id, ...(d.data() as Omit<SchoolDeletionJob, 'id'>) });
      },
      () => setDeletionJob(null)
    );
    return () => unsub();
  }, [schoolId]);

  const handleSuspendSchool = useCallback(async () => {
    if (!schoolId) return;
    setDangerError(null);
    setDangerBusy(true);
    try {
      await adminSetSchoolSuspended({ schoolId, suspended: true });
      await refetch();
      setSuspendOpen(false);
    } catch (e) {
      setDangerError(getCallableErrorMessage(e));
    } finally {
      setDangerBusy(false);
    }
  }, [schoolId, refetch]);

  const handleReactivateSchool = useCallback(async () => {
    if (!schoolId) return;
    setDangerError(null);
    setDangerBusy(true);
    try {
      await adminSetSchoolSuspended({ schoolId, suspended: false });
      await refetch();
      setReactivateOpen(false);
    } catch (e) {
      setDangerError(getCallableErrorMessage(e));
    } finally {
      setDangerBusy(false);
    }
  }, [schoolId, refetch]);

  const handleQueueDeletionConfirm = useCallback(async () => {
    if (!schoolId || !school) return;
    setDangerError(null);
    setDangerBusy(true);
    try {
      await adminQueueSchoolDeletion({ schoolId, confirmation: school.name.trim() });
      setQueueDeleteOpen(false);
      setPurgeNameInput('');
      await refetch();
    } catch (e) {
      setDangerError(getCallableErrorMessage(e));
    } finally {
      setDangerBusy(false);
    }
  }, [schoolId, school, refetch]);

  const handleCancelQueuedDeletion = useCallback(async () => {
    if (!deletionJob?.id) return;
    setDangerError(null);
    setDangerBusy(true);
    try {
      await adminCancelSchoolDeletion({ jobId: deletionJob.id });
      setCancelJobOpen(false);
      await refetch();
    } catch (e) {
      setDangerError(getCallableErrorMessage(e));
    } finally {
      setDangerBusy(false);
    }
  }, [deletionJob, refetch]);

  if (loading) {
    return <LoadingScreen message="Loading school…" variant="primary" />;
  }

  if (error || !school) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/schools"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">
            {error ?? 'School not found.'}
          </p>
        </div>
      </div>
    );
  }

  const subscriptionStatus = school.subscriptionStatus ?? 'active';
  const accountSuspended =
    subscriptionStatus !== 'active' || school.status === 'SUSPENDED';
  const purgeNameMatches = purgeNameInput.trim() === school.name.trim();
  const deletionPending = deletionJob?.status === 'pending';
  const deletionProcessing = deletionJob?.status === 'processing';

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={suspendOpen}
        onClose={() => !dangerBusy && setSuspendOpen(false)}
        title="Suspend this school?"
        message="Staff, teachers, and parents will immediately lose access to this school’s data through the apps. Documents are kept — use Reactivate school account to restore access. Public join links and QR registration will reject new sign-ups while suspended."
        confirmLabel="Suspend school"
        cancelLabel="Cancel"
        confirmDisabled={dangerBusy}
        onConfirm={() => void handleSuspendSchool()}
      />
      <ConfirmDialog
        open={reactivateOpen}
        onClose={() => !dangerBusy && setReactivateOpen(false)}
        title="Reactivate this school?"
        message="Billing status will be set back to active and onboarding to ACTIVE so staff and parents can use the school again."
        confirmLabel="Reactivate school"
        cancelLabel="Cancel"
        confirmDisabled={dangerBusy}
        onConfirm={() => void handleReactivateSchool()}
      />
      <ConfirmDialog
        open={queueDeleteOpen}
        onClose={() => !dangerBusy && setQueueDeleteOpen(false)}
        title="Queue permanent deletion?"
        message="Deletion will run automatically after seven business days (UTC, Monday–Friday only; public holidays not excluded). Until then the school is suspended and all data stays in Firestore. You can cancel the job from Scheduled deletions or this page while it is still pending. When the job runs, all documents under this school are removed and user profiles are unlinked — Auth accounts are not deleted. Confirm only if the typed name matched exactly."
        confirmLabel="Schedule deletion"
        cancelLabel="Cancel"
        confirmDisabled={dangerBusy || !purgeNameMatches}
        onConfirm={() => void handleQueueDeletionConfirm()}
      />
      <ConfirmDialog
        open={cancelJobOpen}
        onClose={() => !dangerBusy && setCancelJobOpen(false)}
        title="Cancel scheduled deletion?"
        message={`This restores an active subscription and lifecycle state for "${school.name}" if the school document still exists, and removes the pending deletion job. Data is not wiped.`}
        confirmLabel="Cancel deletion job"
        cancelLabel="Back"
        confirmDisabled={dangerBusy}
        onConfirm={() => void handleCancelQueuedDeletion()}
      />
      <PageHero
        variant="full"
        backHref="/admin/schools"
        backLabel="Schools"
        title={<span className="text-gradient-warm">{school.name}</span>}
        subtitle="Overview"
        actions={
          <button type="button" onClick={() => refetch()} className="btn-secondary shrink-0">
            Refresh
          </button>
        }
      />

      {/* School information */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
          School information
        </h2>
        <SectionCard topBar="primary" padding="default">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Name</dt>
              <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{school.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Subscription</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {subscriptionStatus}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Lifecycle status</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{school.status ?? '—'}</dd>
            </div>
            {school.address && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Address</dt>
                <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{school.address}</dd>
              </div>
            )}
            {school.contactEmail && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact email</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${school.contactEmail}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                    {school.contactEmail}
                  </a>
                </dd>
              </div>
            )}
            {school.contactPhone && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact phone</dt>
                <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{school.contactPhone}</dd>
              </div>
            )}
            {school.website && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Website</dt>
                <dd className="mt-0.5">
                  <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">
                    {school.website}
                  </a>
                </dd>
              </div>
            )}
            {school.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Description</dt>
                <dd className="mt-0.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{school.description}</dd>
              </div>
            )}
          </dl>
        </SectionCard>
      </section>

      {/* Links to Teachers, Classes, Children, Reports */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href={`/admin/schools/${schoolId}/teachers`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{teachers.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Teachers</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Staff and principals</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/classes`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{classes.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Classes</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rooms and groups</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/children`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{children.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Children</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enrolled children</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/reports`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">—</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Reports</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily activity logs</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/usage`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">—</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Usage & analytics</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Activity overview</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/settings`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">⚙</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Configure school</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enable/disable features</p>
        </Link>
      </div>

      <section className="mt-12" aria-labelledby="danger-zone-heading">
        <div className="overflow-hidden rounded-2xl border border-red-200/90 shadow-md dark:border-red-900/55 dark:shadow-none">
          <div className="flex flex-wrap items-start gap-4 border-b border-red-100 bg-gradient-to-r from-red-50/95 via-red-50/80 to-orange-50/40 px-5 py-4 dark:border-red-900/45 dark:from-red-950/55 dark:via-red-950/35 dark:to-slate-900/40">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 ring-2 ring-red-200/70 dark:bg-red-900/55 dark:text-red-200 dark:ring-red-800/80"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="danger-zone-heading"
                className="text-base font-semibold tracking-tight text-red-950 dark:text-red-100 sm:text-lg"
              >
                Danger zone
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-red-900/85 dark:text-red-100/85">
                These actions affect all staff, families, and public join flows for{' '}
                <span className="font-medium text-red-950 dark:text-red-50">{school.name}</span>.
                Separate read-only tooling is not gated here — choose deliberately.
              </p>
            </div>
          </div>

          <div className="space-y-4 bg-white p-5 dark:bg-slate-800">
            {dangerError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-700 dark:bg-red-950/50 dark:text-red-100"
              >
                {dangerError}
              </div>
            ) : null}

            {/* Suspend / reactivate */}
            <div className="relative rounded-xl border border-slate-200/90 bg-slate-50/40 dark:border-slate-600 dark:bg-slate-900/30">
              <div
                className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-600"
                aria-hidden
              />
              <div className="flex flex-col gap-5 p-5 pl-7 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200/95">
                    Access control
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    Suspend school account
                  </h3>
                  <ul className="mt-3 list-none space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>Blocks principals, teachers, and parents from using this school in the apps.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>Turns off public join and QR registration for new families.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>Data stays in Firestore until a scheduled purge runs or you remove it elsewhere.</span>
                    </li>
                  </ul>
                  {accountSuspended ? (
                    <p className="mt-4 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/70 dark:bg-amber-950/35 dark:text-amber-50">
                      <span className="font-medium text-amber-950 dark:text-amber-100">Currently suspended.</span>{' '}
                      Staff dashboards and parent access remain blocked until you reactivate below
                      {deletionPending ? ' (cancel pending deletion first)' : ''}.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:pt-1">
                  {accountSuspended ? (
                    <>
                      <button
                        type="button"
                        disabled={dangerBusy || deletionPending || deletionProcessing}
                        onClick={() => setReactivateOpen(true)}
                        className="btn-primary w-full whitespace-nowrap px-5 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                      >
                        Reactivate school account
                      </button>
                      {deletionPending ? (
                        <span className="max-w-[14rem] text-center text-[11px] leading-snug text-amber-800 dark:text-amber-200 sm:text-right">
                          A deletion is queued — cancel that job below to reopen this school.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={dangerBusy}
                      onClick={() => {
                        setDangerError(null);
                        setSuspendOpen(true);
                      }}
                      className="inline-flex w-full items-center justify-center rounded-xl border-2 border-amber-600/85 bg-white px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-amber-950/40 sm:w-auto"
                    >
                      Suspend school account
                    </button>
                  )}
                  <span className="text-center text-xs text-slate-500 dark:text-slate-500 sm:text-right">
                    Safe to undo later
                  </span>
                </div>
              </div>
            </div>

            {/* Scheduled permanent deletion */}
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
                        onClick={() => setCancelJobOpen(true)}
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
                      onChange={(e) => {
                        setPurgeNameInput(e.target.value);
                        setDangerError(null);
                      }}
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
                        onClick={() => {
                          setDangerError(null);
                          setQueueDeleteOpen(true);
                        }}
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
          </div>
        </div>
      </section>
    </div>
  );
}
