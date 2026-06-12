import type { DailyReport } from 'shared/types';
import {
  PHOTO_REPORT_LABEL,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_STYLES,
} from '@/constants/reports';

export type ReportDisplayFields = Pick<
  DailyReport,
  'type' | 'imageUrl' | 'photoCategory' | 'mediaType' | 'incidentDetails'
>;

/** Teacher photo posts are stored as type `incident` with media attached. */
export function isPhotoReport(report: ReportDisplayFields): boolean {
  if (report.type !== 'incident') return false;
  return !!(
    report.imageUrl?.trim() ||
    report.photoCategory?.trim() ||
    report.mediaType?.trim()
  );
}

export function getReportTypeLabel(report: ReportDisplayFields): string {
  if (isPhotoReport(report)) return PHOTO_REPORT_LABEL;
  return REPORT_TYPE_LABELS[report.type ?? ''] ?? report.type ?? '—';
}

export function getReportTypeStyle(report: ReportDisplayFields): string {
  if (isPhotoReport(report)) return REPORT_TYPE_STYLES.photo;
  return (
    REPORT_TYPE_STYLES[report.type ?? ''] ??
    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  );
}

/** Match principal report filters (`photo` / `incident` are virtual values). */
export function reportMatchesTypeFilter(report: ReportDisplayFields, filterType: string): boolean {
  if (!filterType) return true;
  if (filterType === 'photo') return isPhotoReport(report);
  if (filterType === 'incident') return report.type === 'incident' && !isPhotoReport(report);
  return report.type === filterType;
}

export function getReportDetailsSummary(
  report: Pick<
    DailyReport,
    'type' | 'mealOptionName' | 'mealType' | 'medicationName' | 'incidentDetails' | 'photoCategory'
  >
): string {
  if (isPhotoReport(report)) return report.photoCategory?.trim() || '—';
  return (
    report.mealOptionName ??
    report.mealType ??
    report.medicationName ??
    report.incidentDetails ??
    '—'
  );
}

/** Max dates offered as “jump to day with activity” shortcuts (see `getDaysWithActivity`). */
export const DAYS_WITH_ACTIVITY_JUMP_LIMIT = 3;

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

/** Unique dates (YYYY-MM-DD) that have at least one report, sorted descending, capped (for “jump to” shortcuts). */
export function getDaysWithActivity(
  reports: DailyReport[],
  limit = DAYS_WITH_ACTIVITY_JUMP_LIMIT
): string[] {
  const days = Array.from(
    new Set(reports.map((r) => r.timestamp?.slice(0, 10)).filter(Boolean)) as Set<string>
  ).sort((a, b) => b.localeCompare(a));
  return days.slice(0, limit);
}

/** Human-readable summary of report counts by type for a list of reports. */
export function getActivitySummaryText(reports: DailyReport[]): string {
  const byType = reports.reduce<Record<string, number>>((acc, r) => {
    const label = getReportTypeLabel(r);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(byType)
    .map(([label, count]) => `${count} ${label}`)
    .join(', ');
}
