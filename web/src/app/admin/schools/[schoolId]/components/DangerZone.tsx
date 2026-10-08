import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { School } from 'shared/types';
import type { SchoolDangerZone } from '../useSchoolDangerZone';
import { DeletionPanel } from './DeletionPanel';
import { SuspendPanel } from './SuspendPanel';

function DangerDialogs({ zone, school }: { zone: SchoolDangerZone; school: School }) {
  const purgeNameMatches = zone.purgeName.trim() === school.name.trim();
  const common = { onClose: zone.close, cancelLabel: 'Cancel', confirmDisabled: zone.busy };
  return (
    <>
      <ConfirmDialog
        {...common}
        open={zone.dialog === 'suspend'}
        title="Suspend this school?"
        message="Staff, teachers, and parents will immediately lose access to this school’s data through the apps. Documents are kept — use Reactivate school account to restore access. Public join links and QR registration will reject new sign-ups while suspended."
        confirmLabel="Suspend school"
        onConfirm={() => void zone.suspend()}
      />
      <ConfirmDialog
        {...common}
        open={zone.dialog === 'reactivate'}
        title="Reactivate this school?"
        message="Billing status will be set back to active and onboarding to ACTIVE so staff and parents can use the school again."
        confirmLabel="Reactivate school"
        onConfirm={() => void zone.reactivate()}
      />
      <ConfirmDialog
        {...common}
        open={zone.dialog === 'queue'}
        title="Queue permanent deletion?"
        message="Deletion will run automatically after seven business days (UTC, Monday–Friday only; public holidays not excluded). Until then the school is suspended and all data stays in Firestore. You can cancel the job from Scheduled deletions or this page while it is still pending. When the job runs, all documents under this school are removed and user profiles are unlinked — Auth accounts are not deleted. Confirm only if the typed name matched exactly."
        confirmLabel="Schedule deletion"
        confirmDisabled={zone.busy || !purgeNameMatches}
        onConfirm={() => void zone.queueDeletion()}
      />
      <ConfirmDialog
        {...common}
        open={zone.dialog === 'cancel'}
        title="Cancel scheduled deletion?"
        message={`This restores an active subscription and lifecycle state for "${school.name}" if the school document still exists, and removes the pending deletion job. Data is not wiped.`}
        confirmLabel="Cancel deletion job"
        cancelLabel="Back"
        onConfirm={() => void zone.cancelDeletion()}
      />
    </>
  );
}

export function DangerZone({ zone, school }: { zone: SchoolDangerZone; school: School }) {
  const accountSuspended = (school.subscriptionStatus ?? 'active') !== 'active' || school.status === 'SUSPENDED';
  return (
    <>
      <DangerDialogs zone={zone} school={school} />
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
            {zone.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-700 dark:bg-red-950/50 dark:text-red-100"
              >
                {zone.error}
              </div>
            ) : null}
            <SuspendPanel
              accountSuspended={accountSuspended}
              deletionPending={zone.deletionJob?.status === 'pending'}
              deletionProcessing={zone.deletionJob?.status === 'processing'}
              dangerBusy={zone.busy}
              onReactivate={() => zone.open('reactivate')}
              onSuspend={() => zone.open('suspend')}
            />
            <DeletionPanel
              school={school}
              deletionJob={zone.deletionJob}
              dangerBusy={zone.busy}
              purgeNameInput={zone.purgeName}
              onPurgeNameChange={zone.setPurgeName}
              onCancelJob={() => zone.open('cancel')}
              onQueue={() => zone.open('queue')}
            />
          </div>
        </div>
      </section>
    </>
  );
}
