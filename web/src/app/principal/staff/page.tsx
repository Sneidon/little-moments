'use client';

import { useState } from 'react';
import { useStaffPage } from '@/hooks/useStaffPage';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  StaffPageHeader,
  StaffFilters,
  StaffTable,
  AddTeacherForm,
  InviteTeacherForm,
  EditTeacherForm,
} from './components';
import type { UserProfile } from 'shared/types';
import { SectionCard, TableSkeleton, FilterSkeleton } from '@/components/ui';

export default function StaffPage() {
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState<UserProfile | null>(null);
  const {
    loading,
    filteredStaff,
    staffMembers,
    classForTeacher,
    formatDate,
    staffRoleFilter,
    setStaffRoleFilter,
    staffSearch,
    setStaffSearch,
    showAddForm,
    setShowAddForm,
    showInviteTeacherForm,
    inviteTeacherForm,
    setInviteTeacherForm,
    inviteTeacherError,
    inviteTeacherSubmitting,
    inviteTeacherResult,
    handleInviteTeacherByEmail,
    openInviteTeacherForm,
    resetInviteTeacherForm,
    addForm,
    setAddForm,
    addTeacherError,
    addTeacherSubmitting,
    handleAddTeacher,
    openAddForm,
    editingUid,
    editForm,
    setEditForm,
    editError,
    editSubmitting,
    startEditTeacher,
    handleUpdateTeacher,
    cancelEditTeacher,
    handleExportPdf,
    handleExportCsv,
    handleExportExcel,
    passwordResetLoadingUid,
    passwordResetError,
    passwordResetSuccess,
    handleRequestPasswordReset,
    clearPasswordResetFeedback,
  } = useStaffPage();

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
      <StaffPageHeader
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onInviteTeacher={openInviteTeacherForm}
        onAddTeacher={openAddForm}
      />

      {showInviteTeacherForm && (
        <InviteTeacherForm
          form={inviteTeacherForm}
          setForm={setInviteTeacherForm}
          error={inviteTeacherError}
          submitting={inviteTeacherSubmitting}
          inviteResult={inviteTeacherResult}
          onSubmit={handleInviteTeacherByEmail}
          onCancel={resetInviteTeacherForm}
        />
      )}

      {showAddForm && (
        <AddTeacherForm
          form={addForm}
          setForm={setAddForm}
          error={addTeacherError}
          submitting={addTeacherSubmitting}
          onSubmit={handleAddTeacher}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingUid && (
        <EditTeacherForm
          form={editForm}
          setForm={setEditForm}
          error={editError}
          submitting={editSubmitting}
          onSubmit={handleUpdateTeacher}
          onCancel={cancelEditTeacher}
        />
      )}

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
          <StaffFilters
            roleFilter={staffRoleFilter}
            onRoleFilterChange={setStaffRoleFilter}
            search={staffSearch}
            onSearchChange={setStaffSearch}
            filteredCount={filteredStaff.length}
            totalCount={staffMembers.length}
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
                <span>Password reset email sent. The user will receive a link to set a new password.</span>
              )}
            </div>
          )}
          <StaffTable
            staff={filteredStaff}
            totalCount={staffMembers.length}
            classForTeacher={classForTeacher}
            formatDate={formatDate}
            onEditTeacher={startEditTeacher}
            onRequestPasswordReset={(u) => setPendingPasswordResetUser(u)}
            passwordResetLoadingUid={passwordResetLoadingUid}
          />
        </>
      )}
    </div>
  );
}
