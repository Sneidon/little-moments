'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { downloadReportsCsv } from '@/lib/exportReportsCsv';
import { exportReportsToExcel } from '@/lib/exportReportsExcel';
import { exportReportsToPdf } from '@/lib/exportReportsPdf';
import { formatReportsFiltersSummary } from '@/lib/exportReportsFilters';
import type { ReportRow, ReportsFiltersState } from '@/hooks/useReportsPage';
import { PageHero } from '@/components/ui';

interface ReportsPageHeaderProps {
  filteredReports: ReportRow[];
  filters: ReportsFiltersState;
  showClassColumn: boolean;
  classDisplay: (id: string) => string;
  schoolName?: string;
}

export function ReportsPageHeader({
  filteredReports,
  filters,
  showClassColumn,
  classDisplay,
  schoolName,
}: ReportsPageHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtersApplied = useMemo(
    () => formatReportsFiltersSummary(filters, { getClassName: classDisplay }),
    [filters, classDisplay]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCsv = () => {
    downloadReportsCsv(filteredReports, undefined, {
      includeClass: showClassColumn,
      filtersApplied,
      classDisplay,
    });
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    exportReportsToExcel(filteredReports, {
      includeClass: showClassColumn,
      filtersApplied,
      classDisplay,
    });
    setExportOpen(false);
  };

  const handleExportPdf = () => {
    exportReportsToPdf(filteredReports, {
      includeClass: showClassColumn,
      classDisplay,
      filtersApplied,
      schoolName,
    });
    setExportOpen(false);
  };

  const exportCount = filteredReports.length;
  const exportLabel = exportCount === 0
    ? 'Export (no data)'
    : `Export ${exportCount} ${exportCount === 1 ? 'report' : 'reports'}`;

  return (
    <PageHero
      variant="full"
      title={<span className="text-gradient-warm">Reports</span>}
      subtitle="Daily activity logs"
      actions={
        <>
          <span className="sr-only">{exportLabel}</span>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="btn-secondary inline-flex items-center gap-2"
              aria-expanded={exportOpen}
              aria-haspopup="true"
              title="More export options"
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
                  onClick={handleExportCsv}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
                  Spreadsheet (CSV)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
                  Excel
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportPdf}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
                  PDF document
                </button>
              </div>
            )}
          </div>
        </>
      }
    />
  );
}
