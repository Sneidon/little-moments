'use client';

import { useState } from 'react';
import { useParentsPage } from '@/hooks/useParentsPage';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ParentsPageHeader, ParentsFilters, ParentsTable } from './components';
import type { UserProfile } from 'shared/types';

export default function ParentsPage() {
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState<UserProfile | null>(null);
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
  } = useParentsPage();

  const handleConfirmPasswordReset = () => {
    if (pendingPasswordResetUser) {
      handleRequestPasswordReset(pendingPasswordResetUser);
      setPendingPasswordResetUser(null);
    }
  };

  return (
    <div className="animate-fade-in">
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
        <div className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
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
          />
        </>
      )}
    </div>
  );
}
