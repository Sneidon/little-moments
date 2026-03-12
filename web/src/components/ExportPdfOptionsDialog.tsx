'use client';

import React from 'react';

export interface ExportSection {
  id: string;
  label: string;
}

export interface ExportPdfOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  sections: readonly ExportSection[];
  defaultSelectedIds?: string[];
  onExport: (selectedIds: string[]) => void;
}

export function ExportPdfOptionsDialog({
  open,
  onClose,
  title = 'Export to PDF',
  sections,
  defaultSelectedIds,
  onExport,
}: ExportPdfOptionsDialogProps) {
  const [selected, setSelected] = React.useState<Set<string>>(() =>
    new Set(defaultSelectedIds ?? sections.map((s) => s.id))
  );

  React.useEffect(() => {
    if (open) {
      setSelected(
        new Set(defaultSelectedIds ?? sections.map((s) => s.id))
      );
    }
  }, [open, defaultSelectedIds, sections]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    onExport(ids);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-pdf-title"
      onClick={onClose}
    >
      <div
        className="dialog-panel-top"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="export-pdf-title" className="dialog-title">
          {title}
        </h2>
        <p className="dialog-description">
          Choose which sections to include in the PDF.
        </p>
        <ul className="mb-6 space-y-3">
          {sections.map((section) => (
            <li key={section.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`export-${section.id}`}
                checked={selected.has(section.id)}
                onChange={() => toggle(section.id)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
              />
              <label
                htmlFor={`export-${section.id}`}
                className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                {section.label}
              </label>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selected.size === 0}
            className="btn-primary disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
