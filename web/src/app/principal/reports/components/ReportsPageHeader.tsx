'use client';

import { useMemo } from 'react';
import { downloadReportsCsv } from '@/lib/export/reports';
import { exportReportsToExcel } from '@/lib/export/reports';
import { exportReportsToPdf } from '@/lib/export/reportsPdf';
import { formatReportsFiltersSummary } from '@/lib/export/reportsFilters';
import type { ReportRow, ReportsFiltersState } from '@/hooks/useReportsPage';
import { PageHero, ExportMenu } from '@/components/ui';

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

  const filtersApplied = useMemo(
    () => formatReportsFiltersSummary(filters, { getClassName: classDisplay }),
    [filters, classDisplay]
  );

  const handleExportCsv = () => {
    downloadReportsCsv(filteredReports, undefined, {
      includeClass: showClassColumn,
      filtersApplied,
      classDisplay,
    });
  };

  const handleExportExcel = () => {
    exportReportsToExcel(filteredReports, {
      includeClass: showClassColumn,
      filtersApplied,
      classDisplay,
    });
  };

  const handleExportPdf = () => {
    exportReportsToPdf(filteredReports, {
      includeClass: showClassColumn,
      classDisplay,
      filtersApplied,
      schoolName,
    });
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
          <ExportMenu
            className="relative shrink-0"
            onCsv={handleExportCsv}
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            title="More export options"
          />
        </>
      }
    />
  );
}
