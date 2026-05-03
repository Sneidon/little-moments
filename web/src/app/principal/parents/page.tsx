'use client';

import { useEffect, useState } from 'react';
import { useParentsPage } from '@/hooks/useParentsPage';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ParentsPageHeader, ParentsFilters, ParentsTable } from './components';
import { SectionCard, TableSkeleton, FilterSkeleton } from '@/components/ui';
import type { UserProfile } from 'shared/types';

export default function ParentsPage() {
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState<UserProfile | null>(null);
  const [pendingDeleteParent, setPendingDeleteParent] = useState<UserProfile | null>(null);
  const [deleteParentDialogBusy, setDeleteParentDialogBusy] = useState(false);
  const {
    loading,
    filteredParents,
    parents,
    children,
    parentSearch,
    setParentSearch,
    parentChildFilter,
    setParentChildFilter,
    exportingPdf,
    handleExportPdf,
    handleExportCsv,
    handleExportExcel,
    passwordResetLoadingUid,
    passwordResetError,
    passwordResetSuccess,
    handleRequestPasswordReset,
    clearPasswordResetFeedback,
    deletingParentUid,
    deleteParentError,
    handleDeleteParent,
  } = useParentsPage();

  useEffect(() => {
    if (!pendingDeleteParent) setDeleteParentDialogBusy(false);
  }, [pendingDeleteParent]);

  const handleConfirmPasswordReset = () => {
    if (pendingPasswordResetUser) {
      handleRequestPasswordReset(pendingPasswordResetUser);
      setPendingPasswordResetUser(null);
    }
  };

  const handleConfirmDeleteParent = async () => {
    if (!pendingDeleteParent || deleteParentDialogBusy) return;
    setDeleteParentDialogBusy(true);
    try {
      const ok = await handleDeleteParent(pendingDeleteParent.uid);
      if (ok) setPendingDeleteParent(null);
    } finally {
      setDeleteParentDialogBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={!!pendingDeleteParent}
        onClose={() => setPendingDeleteParent(null)}
        title="Delete parent?"
        message={
          pendingDeleteParent
            ? `Permanently unlink ${pendingDeleteParent.displayName || pendingDeleteParent.email || 'this parent'} from every child at your school and delete their account? They will no longer be able to sign in. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete parent"
        cancelLabel="Cancel"
        confirmDisabled={
          deleteParentDialogBusy ||
          Boolean(pendingDeleteParent && deletingParentUid === pendingDeleteParent.uid)
        }
        onConfirm={handleConfirmDeleteParent}
      />
      <ConfirmDialog
        open={!!pendingPasswordResetUser}
        onClose={() => setPendingPasswordResetUser(null)}
        title="Send password reset email?"
        message={
          pendingPasswordResetUser
            ? `Send a password reset link to ${pendingPasswordResetUser.email}? They will receive an email to set a new password.`
            : ''
        }
        confirmLabel="Send reset email"
        onConfirm={handleConfirmPasswordReset}
      />
      <ParentsPageHeader
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        exportDisabled={exportingPdf || filteredParents.length === 0}
        exporting={exportingPdf}
      />

      {loading ? (
        <>
          <SectionCard topBar="warm" padding="default" className="mb-6">
            <FilterSkeleton />
          </SectionCard>
          <SectionCard topBar="accent" padding="none">
            <TableSkeleton />
          </SectionCard>
        </>
      ) : (
        <>
          <ParentsFilters
            search={parentSearch}
            onSearchChange={setParentSearch}
            childFilter={parentChildFilter}
            onChildFilterChange={setParentChildFilter}
            children={children}
            filteredCount={filteredParents.length}
            totalCount={parents.length}
          />
          {deleteParentError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {deleteParentError}
            </div>
          )}
          {(passwordResetError || passwordResetSuccess) && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                passwordResetError
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                  : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200'
              }`}
            >
              {passwordResetError ? (
                <span className="flex items-center justify-between gap-2">
                  {passwordResetError}
                  <button
                    type="button"
                    onClick={clearPasswordResetFeedback}
                    className="shrink-0 underline"
                  >
                    Dismiss
                  </button>
                </span>
              ) : (
                <span>Password reset email sent. The parent will receive a link to set a new password.</span>
              )}
            </div>
          )}
          <ParentsTable
            parents={filteredParents}
            totalCount={parents.length}
            onRequestPasswordReset={(u) => setPendingPasswordResetUser(u)}
            passwordResetLoadingUid={passwordResetLoadingUid}
            onDeleteParent={(u) => setPendingDeleteParent(u)}
            deletingParentUid={deletingParentUid}
          />
        </>
      )}
    </div>
  );
}
