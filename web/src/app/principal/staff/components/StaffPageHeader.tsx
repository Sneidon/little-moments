'use client';

export interface StaffPageHeaderProps {
  onExportPdf: () => void;
  onAddTeacher: () => void;
}

export function StaffPageHeader({ onExportPdf, onAddTeacher }: StaffPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Staff & teachers
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Teachers and principals at your school. Assign from Classes; parents are on the Parents page.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" onClick={onExportPdf} className="btn-secondary">
          Export to PDF
        </button>
        <button type="button" onClick={onAddTeacher} className="btn-primary">
          Add teacher
        </button>
      </div>
    </div>
  );
}
