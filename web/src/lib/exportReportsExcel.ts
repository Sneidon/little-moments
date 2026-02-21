import * as XLSX from 'xlsx';
import type { ReportRow } from '@/hooks/useReportsPage';

export interface ExportReportsExcelOptions {
  includeClass?: boolean;
  sheetName?: string;
  filename?: string;
  filtersApplied?: string;
}

/** Export report rows to Excel (.xlsx) and trigger download. */
export function exportReportsToExcel(
  rows: ReportRow[],
  options: ExportReportsExcelOptions = {}
): void {
  const { includeClass = true, sheetName = 'Reports', filename, filtersApplied } = options;
  const headers = [
    'Child',
    ...(includeClass ? ['Class'] : []),
    'Type',
    'Date',
    'Time',
    'Details',
    'Notes',
  ];
  const dataRows = rows.map((r) => {
    const date = r.timestamp ? new Date(r.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const time = r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
    const details = r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '';
    const row: string[] = [
      r.childName ?? '',
      ...(includeClass ? [r.childClassId ?? ''] : []),
      r.type ?? '',
      date,
      time,
      details,
      r.notes ?? '',
    ];
    return row;
  });
  const exportDate = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const tableRows: (string[] | (string | number)[])[] = [];
  if (filtersApplied) {
    tableRows.push(['Exported:', exportDate]);
    tableRows.push(['Filters applied:', filtersApplied]);
    tableRows.push([]);
  }
  tableRows.push(headers);
  tableRows.push(...dataRows);
  const ws = XLSX.utils.aoa_to_sheet(tableRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const outFilename = filename ?? `reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, outFilename);
}
