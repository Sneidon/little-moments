'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';

export interface ClassDetailHeaderProps {
  classRoom: ClassRoom;
  assignedTeacherName: string;
  childrenCount: number;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  /** Back link href. Default: /principal/classes */
  backHref?: string;
  /** Back link label. Default: Back to classes */
  backLabel?: string;
  /** Show "Edit details" link. Default: true */
  showEditLink?: boolean;
}

export function ClassDetailHeader({
  classRoom,
  assignedTeacherName,
  childrenCount,
  onExportPdf,
  onExportCsv,
  onExportExcel,
  backHref = '/principal/classes',
  backLabel = 'Back to classes',
  showEditLink = true,
}: ClassDetailHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePdf = () => {
    onExportPdf?.();
    setExportOpen(false);
  };
  const handleCsv = () => {
    onExportCsv?.();
    setExportOpen(false);
  };
  const handleExcel = () => {
    onExportExcel?.();
    setExportOpen(false);
  };

  const showExport = onExportPdf ?? onExportCsv ?? onExportExcel;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showEditLink && (
            <Link
              href={`/principal/classes?edit=${classRoom.id}`}
              className="btn-secondary"
            >
              Edit details
            </Link>
          )}
          {showExport && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="btn-secondary inline-flex items-center gap-2"
                aria-expanded={exportOpen}
                aria-haspopup="true"
              >
                <span>Export</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1.5 shadow-xl"
                  role="menu"
                >
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Download as
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCsv}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
                    Spreadsheet (CSV)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExcel}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
                    Excel
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handlePdf}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
                    PDF document
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {formatClassDisplay(classRoom)}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Assigned teacher: {assignedTeacherName}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {childrenCount} child{childrenCount !== 1 ? 'ren' : ''} in this class
        </p>
      </div>
    </>
  );
}
