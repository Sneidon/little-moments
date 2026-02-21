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
    <div className="animate-fade-in">
      <StaffPageHeader onExportPdf={handleExportPdf} onAddTeacher={openAddForm} />

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
        <div className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
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
