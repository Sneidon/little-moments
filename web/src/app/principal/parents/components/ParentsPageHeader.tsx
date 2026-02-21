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
    <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Parents</h1>
      <button
        type="button"
        onClick={onExportPdf}
        disabled={exportDisabled}
        className="btn-secondary disabled:opacity-50"
      >
        {exporting ? 'Exporting…' : 'Export PDF'}
      </button>
    </div>
  );
}
