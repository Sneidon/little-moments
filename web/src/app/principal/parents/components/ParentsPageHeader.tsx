'use client';

export interface ParentsPageHeaderProps {
  onExportPdf: () => void;
  exportDisabled: boolean;
  exporting: boolean;
}

export function ParentsPageHeader({
  onExportPdf,
  exportDisabled,
  exporting,
}: ParentsPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Parents
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Parents linked to children at your school. Invite and manage from each child&apos;s profile.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exportDisabled}
          className="btn-secondary disabled:opacity-50"
          title={exportDisabled ? 'No parents to export' : 'Export parents list to PDF'}
        >
          {exporting ? 'Exporting…' : 'Export to PDF'}
        </button>
      </div>
    </div>
  );
}
