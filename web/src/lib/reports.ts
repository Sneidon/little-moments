import { formatMealAmount, formatMealCategoryLabel } from 'shared/reportLabels';
import type { DailyReport } from 'shared/types';
import {
  PHOTO_REPORT_LABEL,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_STYLES,
} from '@/constants/reports';

/** Normalize Firestore Timestamp / Date / ISO string to ISO string. */
export function toIsoTimestamp(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

/** Local calendar date as YYYY-MM-DD (matches HTML date inputs). */
export function localDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function timestampToLocalDateIso(timestamp: unknown): string {
  const iso = toIsoTimestamp(timestamp);
  if (!iso) return '';
  return localDateIso(new Date(iso));
}

export function reportMatchesLocalDay(timestamp: unknown, filterDay: string): boolean {
  if (!filterDay) return true;
  return timestampToLocalDateIso(timestamp) === filterDay;
}

export type ReportDisplayFields = Pick<
  DailyReport,
  'type' | 'imageUrl' | 'photoCategory' | 'mediaType' | 'incidentDetails' | 'mealType'
>;

export type ReportDetailsFields = Pick<
  DailyReport,
  'type' | 'mealOptionName' | 'mealType' | 'medicationName' | 'incidentDetails' | 'photoCategory' | 'notes'
> & {
  activityTitle?: string;
  activityType?: string;
  napStartTime?: string;
  napEndTime?: string;
  nappyType?: string;
};

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
  if (report.type === 'meal') {
    return formatMealCategoryLabel(report.mealType) ?? REPORT_TYPE_LABELS.meal;
  }
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

export function getReportDetailsSummary(report: ReportDetailsFields): string {
  if (isPhotoReport(report)) return report.photoCategory?.trim() || PHOTO_REPORT_LABEL;
  if (report.type === 'meal') return report.mealOptionName?.trim() || '—';
  if (report.type === 'check_in') return 'Checked in';
  if (report.type === 'check_out') return 'Checked out';
  if (report.type === 'nap_time') {
    if (report.napStartTime?.trim() && report.napEndTime?.trim()) {
      return `${report.napStartTime.trim()} – ${report.napEndTime.trim()}`;
    }
    return 'Nap time';
  }
  if (report.type === 'nappy_change') return report.nappyType?.trim() || 'Nappy change';
  if (report.type === 'activity') {
    return report.activityTitle?.trim() || report.activityType?.trim() || 'Activity';
  }
  if (report.type === 'class_change' || report.type === 'child_joined_class') {
    return report.notes?.trim() || '—';
  }
  if (report.type === 'medication') return report.medicationName?.trim() || '—';
  if (report.type === 'incident') return report.incidentDetails?.trim() || '—';
  return '—';
}

/** Notes column text — for meals, includes how much they ate before free-text notes. */
export function getReportNotesSummary(
  report: Pick<DailyReport, 'type' | 'notes' | 'mealAmount'>
): string {
  const notes = report.notes?.trim() || '';
  if (report.type === 'meal') {
    const amount = formatMealAmount(report.mealAmount);
    if (amount && notes) return `${amount} · ${notes}`;
    if (amount) return amount;
  }
  return notes || '—';
}

export function reportHasNotesContent(
  report: Pick<DailyReport, 'type' | 'notes' | 'mealAmount'>
): boolean {
  if (report.notes?.trim()) return true;
  return report.type === 'meal' && !!formatMealAmount(report.mealAmount);
}

/** Max dates offered as “jump to day with activity” shortcuts (see `getDaysWithActivity`). */
export const DAYS_WITH_ACTIVITY_JUMP_LIMIT = 3;

/** Filter reports to a single local calendar day (YYYY-MM-DD) and sort by timestamp descending. */
export function getReportsForDay(reports: DailyReport[], filterDay: string): DailyReport[] {
  return reports
    .filter((r) => {
      const ts = toIsoTimestamp(r.timestamp) || toIsoTimestamp(r.createdAt);
      if (!ts) return false;
      return reportMatchesLocalDay(ts, filterDay);
    })
    .sort((a, b) => {
      const aTs = toIsoTimestamp(a.timestamp) || toIsoTimestamp(a.createdAt);
      const bTs = toIsoTimestamp(b.timestamp) || toIsoTimestamp(b.createdAt);
      return bTs.localeCompare(aTs);
    });
}

/** Unique local dates (YYYY-MM-DD) that have at least one report, sorted descending, capped (for “jump to” shortcuts). */
export function getDaysWithActivity(
  reports: DailyReport[],
  limit = DAYS_WITH_ACTIVITY_JUMP_LIMIT
): string[] {
  const days = Array.from(
    new Set(
      reports
        .map((r) => timestampToLocalDateIso(r.timestamp) || timestampToLocalDateIso(r.createdAt))
        .filter(Boolean)
    )
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
