'use client';

import { useState } from 'react';
import type { SchoolDeletionJob } from 'shared/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHero, SectionCard } from '@/components/ui';
import { adminCancelSchoolDeletion } from '@/services/adminSchool';
import { getCallableErrorMessage } from '@/services/parents';
import { HistoryTable, PendingJobsTable } from './DeletionTables';
import { useDeletionJobs } from './useDeletionJobs';

const ERROR_BOX = 'mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function SchoolDeletionsAdminPage() {
  const { pending, history, loading, error } = useDeletionJobs();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<SchoolDeletionJob | null>(null);

  const cancelJob = async () => {
    if (!confirmCancel?.id) return;
    setBusy(true);
    setActionError(null);
    try {
      await adminCancelSchoolDeletion({ jobId: confirmCancel.id });
      setConfirmCancel(null);
    } catch (e) {
      setActionError(getCallableErrorMessage(e));
    } finally {
      setBusy(false);
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
        onClose={() => !busy && setConfirmCancel(null)}
        title="Cancel scheduled deletion?"
        message={confirmCancel ? `Stop removal for "${confirmCancel.schoolName}" (${confirmCancel.id}) and re-open the school if it still exists.` : ''}
        confirmLabel="Cancel job"
        cancelLabel="Keep scheduled"
        confirmDisabled={busy}
        onConfirm={() => void cancelJob()}
      />
      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-600">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending ({pending.length})
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          Completed &amp; cancelled
        </TabButton>
      </div>
      {error ? <div className={ERROR_BOX}>{error}</div> : null}
      {actionError ? <div className={ERROR_BOX}>{actionError}</div> : null}

      {loading ? (
        <div className="mb-8 flex items-center justify-center gap-3 py-10 text-sm text-slate-500 dark:text-slate-400" role="status">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600 dark:border-slate-600 dark:border-t-primary-400" aria-hidden />
          Loading queue…
        </div>
      ) : tab === 'pending' ? (
        <SectionCard topBar="primary" padding="default">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Nothing in the deletion queue right now.</p>
          ) : (
            <>
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                Rows are executed automatically when the processor runs (typically within 30 minutes of the scheduled timestamp).
              </p>
              <PendingJobsTable jobs={pending} busy={busy} onCancel={setConfirmCancel} />
            </>
          )}
        </SectionCard>
      ) : (
        <SectionCard topBar="accent" padding="default">
          {history.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No completed rows in the last retrieval window.</p>
          ) : (
            <HistoryTable jobs={history} />
          )}
        </SectionCard>
      )}
    </div>
  );
}
