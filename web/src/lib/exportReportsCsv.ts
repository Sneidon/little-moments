import type { ReportRow } from '@/hooks/useReportsPage';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Build CSV string from report rows and return as blob for download. */
export function buildReportsCsv(
  rows: ReportRow[],
  options?: { includeClass?: boolean; filtersApplied?: string }
): string {
  const includeClass = options?.includeClass ?? true;
  const lines: string[] = [];
  if (options?.filtersApplied) {
    lines.push('# Exported: ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    lines.push('# Filters applied: ' + options.filtersApplied);
    lines.push('');
  }
  const headers = [
    'Child',
    ...(includeClass ? ['Class'] : []),
    'Type',
    'Date',
    'Time',
    'Details',
    'Notes',
  ];
  lines.push(headers.map(escapeCsvCell).join(','));
  for (const r of rows) {
    const date = r.timestamp ? new Date(r.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const time = r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
    const details = r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '';
    const row = [
      r.childName ?? '',
      ...(includeClass ? [r.childClassId ?? ''] : []),
      r.type ?? '',
      date,
      time,
      details,
      r.notes ?? '',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return lines.join('\r\n');
}

/** Trigger download of CSV file. */
export function downloadReportsCsv(
  rows: ReportRow[],
  filename?: string,
  options?: { includeClass?: boolean; filtersApplied?: string }
): void {
  const csv = buildReportsCsv(rows, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const name = filename ?? `reports-${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
