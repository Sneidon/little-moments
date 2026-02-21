import type { DailyReport } from 'shared/types';
import { REPORT_TYPE_LABELS } from '@/constants/reports';

/** Filter reports to a single day (ISO date string YYYY-MM-DD) and sort by timestamp descending. */
export function getReportsForDay(reports: DailyReport[], filterDay: string): DailyReport[] {
  return reports
    .filter((r) => {
      const ts = r.timestamp ?? '';
      if (!ts) return false;
      const dayStart = filterDay + 'T00:00:00.000Z';
      const dayEnd = filterDay + 'T23:59:59.999Z';
      return ts >= dayStart && ts <= dayEnd;
    })
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

/** Unique dates (YYYY-MM-DD) that have at least one report, sorted descending, capped. */
export function getDaysWithActivity(reports: DailyReport[], limit = 14): string[] {
  const days = Array.from(
    new Set(reports.map((r) => r.timestamp?.slice(0, 10)).filter(Boolean)) as Set<string>
  ).sort((a, b) => b.localeCompare(a));
  return days.slice(0, limit);
}

/** Human-readable summary of report counts by type for a list of reports. */
export function getActivitySummaryText(reports: DailyReport[], typeLabels = REPORT_TYPE_LABELS): string {
  const byType = reports.reduce<Record<string, number>>((acc, r) => {
    const t = r.type ?? 'other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(byType)
    .map(([type, count]) => `${count} ${typeLabels[type] ?? type}`)
    .join(', ');
}
