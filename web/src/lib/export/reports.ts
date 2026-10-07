import type { ReportRow } from '@/hooks/useReportsPage';
import { formatGenderLabel } from '@/lib/formatGender';
import { getReportDetailsSummary, getReportNotesSummary, getReportTypeLabel } from '@/lib/reports';
import { csvRow, downloadCsv, downloadWorkbook, exportDateLabel, todayStamp, type Cell } from './common';

type ReportsExportOptions = {
  includeClass?: boolean;
  filtersApplied?: string;
  classDisplay?: (classId: string) => string;
};

function reportsTable(rows: ReportRow[], { includeClass = true, classDisplay = (id) => id }: ReportsExportOptions) {
  const headers = ['Child', 'Gender', ...(includeClass ? ['Class'] : []), 'Type', 'Date', 'Time', 'Details', 'Notes'];
  const body = rows.map((r) => {
    const at = r.timestamp ? new Date(r.timestamp) : null;
    const notes = getReportNotesSummary(r);
    return [
      r.childName ?? '',
      formatGenderLabel(r.childGender),
      ...(includeClass ? [r.childClassId ? classDisplay(r.childClassId) : ''] : []),
      getReportTypeLabel(r),
      at ? at.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
      at ? at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
      getReportDetailsSummary(r),
      notes === '—' ? '' : notes,
    ];
  });
  return { headers, body };
}

function filterPreamble(filtersApplied: string | undefined): Cell[][] {
  return filtersApplied ? [['Exported:', exportDateLabel()], ['Filters applied:', filtersApplied], []] : [];
}

export function downloadReportsCsv(rows: ReportRow[], filename?: string, options: ReportsExportOptions = {}): void {
  const { headers, body } = reportsTable(rows, options);
  const preamble = options.filtersApplied ? ['# Exported: ' + exportDateLabel(), '# Filters applied: ' + options.filtersApplied, ''] : [];
  downloadCsv([...preamble, csvRow(headers), ...body.map(csvRow)], filename ?? `reports-${todayStamp()}.csv`);
}

export function exportReportsToExcel(
  rows: ReportRow[],
  options: ReportsExportOptions & { sheetName?: string; filename?: string } = {}
): void {
  const { headers, body } = reportsTable(rows, options);
  downloadWorkbook(
    [{ name: options.sheetName ?? 'Reports', rows: [...filterPreamble(options.filtersApplied), headers, ...body] }],
    options.filename ?? `reports-${todayStamp()}.xlsx`
  );
}
