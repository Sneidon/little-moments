'use client';

import { useStaffPage } from '@/hooks/useStaffPage';
import {
  StaffPageHeader,
  StaffFilters,
  StaffTable,
  AddTeacherForm,
  EditTeacherForm,
} from './components';

export default function StaffPage() {
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
  } = useStaffPage();

  return (
    <div>
      <StaffPageHeader onExportPdf={handleExportPdf} onAddTeacher={openAddForm} />
      <p className="mb-8 text-slate-600 dark:text-slate-300">
        Teachers and principals at your school. Assign teachers to classes from the Classes page. Parents are managed on the Parents page.
      </p>

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
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <>
          <StaffFilters
            roleFilter={staffRoleFilter}
            onRoleFilterChange={setStaffRoleFilter}
            search={staffSearch}
            onSearchChange={setStaffSearch}
          />
          <StaffTable
            staff={filteredStaff}
            totalCount={staffMembers.length}
            classForTeacher={classForTeacher}
            formatDate={formatDate}
            onEditTeacher={startEditTeacher}
          />
        </>
      )}
    </div>
  );
}
