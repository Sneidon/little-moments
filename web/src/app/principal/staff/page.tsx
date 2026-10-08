'use client';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PasswordResetDialog, PasswordResetNotice } from '@/components/PasswordReset';
import { FilterSkeleton, SectionCard, TableSkeleton } from '@/components/ui';
import { useInviteForm } from '@/hooks/useInviteForm';
import { usePasswordReset } from '@/hooks/usePasswordReset';
import {
  EMPTY_SCHOOL_ADMIN_INVITE,
  EMPTY_TEACHER_INVITE,
  inviteSchoolAdmin,
  inviteTeacher,
  type InviteSchoolAdminFormState,
  type InviteTeacherFormState,
} from '@/services/staffInvites';
import type { UserProfile } from 'shared/types';
import { EditTeacherForm, InviteSchoolAdminForm, InviteTeacherForm, StaffFilters, StaffPageHeader, StaffTable } from './components';
import { useStaffRoster } from './useStaffRoster';
import { useTeacherEditor } from './useTeacherEditor';

export default function StaffPage() {
  const roster = useStaffRoster();
  const editor = useTeacherEditor(roster.reload);
  const reset = usePasswordReset<UserProfile>();
  const teacherInvite = useInviteForm<InviteTeacherFormState>({
    initial: EMPTY_TEACHER_INVITE,
    validate: (f) => (f.teacherEmail.trim() ? null : 'Email is required.'),
    send: inviteTeacher,
  });
  const adminInvite = useInviteForm<InviteSchoolAdminFormState>({
    initial: EMPTY_SCHOOL_ADMIN_INVITE,
    validate: (f) => (!f.principalEmail.trim() ? 'Email is required.' : !roster.schoolId ? 'No school on your profile.' : null),
    send: (f) => inviteSchoolAdmin(roster.schoolId as string, f),
  });
  const { pendingDelete } = editor;

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => editor.setPendingDelete(null)}
        title="Remove this teacher?"
        message={
          pendingDelete
            ? `Remove ${pendingDelete.displayName || pendingDelete.email || 'this teacher'} from your school? They will be unassigned from every class and any child they were directly assigned to, their sign-in will stop working, and their profile will be deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove teacher"
        cancelLabel="Cancel"
        onConfirm={editor.confirmDelete}
        confirmDisabled={!!editor.deletingUid}
      />
      <PasswordResetDialog reset={reset} />
      <StaffPageHeader
        onExportPdf={roster.exportPdf}
        onExportCsv={roster.exportCsv}
        onExportExcel={roster.exportExcel}
        onInviteTeacher={() => {
          adminInvite.close();
          teacherInvite.show();
        }}
        onInviteSchoolAdmin={() => {
          teacherInvite.close();
          adminInvite.show();
        }}
      />

      {adminInvite.open && (
        <InviteSchoolAdminForm
          form={adminInvite.form}
          setForm={adminInvite.setForm}
          error={adminInvite.error}
          submitting={adminInvite.submitting}
          inviteResult={adminInvite.result}
          onSubmit={adminInvite.submit}
          onCancel={adminInvite.close}
        />
      )}
      {teacherInvite.open && (
        <InviteTeacherForm
          form={teacherInvite.form}
          setForm={teacherInvite.setForm}
          error={teacherInvite.error}
          submitting={teacherInvite.submitting}
          inviteResult={teacherInvite.result}
          onSubmit={teacherInvite.submit}
          onCancel={teacherInvite.close}
        />
      )}
      {editor.editingUid && (
        <EditTeacherForm
          form={editor.form}
          setForm={editor.setForm}
          error={editor.error}
          submitting={editor.submitting}
          onSubmit={editor.save}
          onCancel={editor.cancel}
        />
      )}

      {roster.loading ? (
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
            roleFilter={roster.roleFilter}
            onRoleFilterChange={roster.setRoleFilter}
            search={roster.search}
            onSearchChange={roster.setSearch}
            filteredCount={roster.filtered.length}
            totalCount={roster.staff.length}
          />
          {editor.deleteError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {editor.deleteError}
            </div>
          )}
          <PasswordResetNotice reset={reset} />
          <StaffTable
            staff={roster.filtered}
            totalCount={roster.staff.length}
            classForTeacher={roster.classForTeacher}
            onEditTeacher={editor.start}
            onDeleteTeacher={editor.setPendingDelete}
            deletingTeacherUid={editor.deletingUid}
            onRequestPasswordReset={reset.setPending}
            passwordResetLoadingUid={reset.loadingUid}
          />
        </>
      )}
    </div>
  );
}
