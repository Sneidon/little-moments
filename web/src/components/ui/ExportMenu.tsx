'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onCsv?: () => void;
  onExcel?: () => void;
  onPdf?: () => void;
  disabled?: boolean;
  busy?: boolean;
  title?: string;
  className?: string;
};

const ITEM_CLASS =
  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700';

const FORMATS = [
  { key: 'onCsv', badge: 'CSV', label: 'Spreadsheet (CSV)', badgeClass: 'bg-slate-200 dark:bg-slate-600' },
  {
    key: 'onExcel',
    badge: 'XLSX',
    label: 'Excel',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
  },
  { key: 'onPdf', badge: 'PDF', label: 'PDF document', badgeClass: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
] as const;

export function ExportMenu({ disabled, busy, title, className = 'relative', ...handlers }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const choose = (action: (() => void) | undefined) => {
    setOpen(false);
    action?.();
  };

  return (
    <div className={className} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="true"
        title={title}
      >
        <span>{busy ? 'Exporting…' : 'Export'}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1.5 shadow-xl"
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Download as</div>
          {FORMATS.filter((f) => handlers[f.key]).map((f) => (
            <button key={f.key} type="button" role="menuitem" onClick={() => choose(handlers[f.key])} className={ITEM_CLASS}>
              <span className={`rounded px-1.5 py-0.5 font-mono text-xs ${f.badgeClass}`}>{f.badge}</span>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
