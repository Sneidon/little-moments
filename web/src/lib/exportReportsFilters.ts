import { REPORT_TYPE_LABELS } from '@/constants/reports';
import type { ReportsFiltersState } from '@/hooks/useReportsPage';

export interface FormatReportsFiltersOptions {
  getClassName?: (classId: string) => string;
}

/**
 * Build a short human-readable summary of the reports filters used.
 * Used in CSV, Excel, and PDF exports.
 */
export function formatReportsFiltersSummary(
  filters: ReportsFiltersState,
  options: FormatReportsFiltersOptions = {}
): string {
  const { getClassName = (id) => id } = options;
  const parts: string[] = [];

  if (filters.classId) {
    parts.push(`Class: ${getClassName(filters.classId)}`);
  } else {
    parts.push('Class: All classes');
  }

  if (filters.day) {
    const d = new Date(filters.day + 'T12:00:00');
    parts.push(`Date: ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`);
  } else if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom
      ? new Date(filters.dateFrom + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : '…';
    const to = filters.dateTo
      ? new Date(filters.dateTo + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : '…';
    parts.push(`Date range: ${from} – ${to}`);
  } else {
    parts.push('Date: All dates');
  }

  if (filters.type) {
    parts.push(`Type: ${REPORT_TYPE_LABELS[filters.type] ?? filters.type}`);
  } else {
    parts.push('Type: All types');
  }

  if (filters.childSearch.trim()) {
    parts.push(`Child: "${filters.childSearch.trim()}"`);
  }

  if (filters.hasNotesOnly) {
    parts.push('Has notes only: Yes');
  }

  parts.push(`Sort: ${filters.sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`);
  parts.push(filters.limit > 0 ? `Max results: ${filters.limit}` : 'Max results: All');

  return parts.join(' · ');
}
