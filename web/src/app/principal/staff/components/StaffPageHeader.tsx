'use client';

export interface StaffPageHeaderProps {
  onExportPdf: () => void;
  onAddTeacher: () => void;
}

export function StaffPageHeader({ onExportPdf, onAddTeacher }: StaffPageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Staff & teachers</h1>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onExportPdf} className="btn-secondary">
          Export PDF
        </button>
        <button
          type="button"
          onClick={onAddTeacher}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add teacher
        </button>
      </div>
    </div>
  );
}
