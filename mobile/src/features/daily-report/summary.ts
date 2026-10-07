import {
  getReportDateStr,
  getReportTitle,
  isParentVisibleReportType,
  parseTimeWithDate,
  type ReportWithExtras,
} from '../../utils/childDailyReportDisplay';

export type ReportAudience = 'teacher' | 'parent';

const ACTIVITY_TYPES: Record<ReportAudience, Set<string>> = {
  teacher: new Set(['activity', 'child_joined_class', 'medication', 'incident', 'check_in', 'check_out']),
  parent: new Set(['activity', 'class_change', 'medication', 'incident', 'check_in', 'check_out']),
};

const LEAD_LABELS: Record<string, string> = {
  meal: 'Meal',
  nap_time: 'Nap Time',
  nappy_change: 'Nappy Change',
  check_in: 'Check In',
  check_out: 'Check Out',
  activity: 'Activity',
  child_joined_class: 'Joined class',
  class_change: 'Class update',
  medication: 'Medication',
  incident: 'Media',
};

const DEFAULT_NAP_MS = 1.5 * 60 * 60 * 1000;

function reportTime(r: ReportWithExtras): string {
  return r.timestamp || r.createdAt;
}

export function getTimelineTitle(item: ReportWithExtras): string {
  const lead = LEAD_LABELS[item.type] ?? item.type.replace(/_/g, ' ');
  const details = getReportTitle(item);
  if (details.trim().toLowerCase() === lead.trim().toLowerCase()) return lead;
  return `${lead}: ${details}`;
}

function napDurationLabel(naps: ReportWithExtras[], date: string): string {
  if (naps.length === 0) return '0h';
  let totalMs = 0;
  for (const r of naps) {
    const reportDate = getReportDateStr(r) || date;
    const startMs = r.napStartTime ? parseTimeWithDate(r.napStartTime, reportDate) : NaN;
    const endMs = r.napEndTime ? parseTimeWithDate(r.napEndTime, reportDate) : NaN;
    totalMs += !isNaN(startMs) && !isNaN(endMs) ? endMs - startMs : DEFAULT_NAP_MS;
  }
  const hours = totalMs / (60 * 60 * 1000);
  if (!Number.isFinite(hours) || hours < 0) return '0h';
  return hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}m`;
}

export function summarizeDay(reports: ReportWithExtras[], date: string, audience: ReportAudience) {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const items = reports
    .filter((r) => audience === 'teacher' || isParentVisibleReportType(r.type))
    .filter((r) => reportTime(r) >= start && reportTime(r) <= end)
    .sort((a, b) => new Date(reportTime(a)).getTime() - new Date(reportTime(b)).getTime());
  const count = (type: string) => items.filter((r) => r.type === type).length;
  return {
    items,
    meals: count('meal'),
    nappy: count('nappy_change'),
    activities: items.filter((r) => ACTIVITY_TYPES[audience].has(r.type)).length,
    napDuration: napDurationLabel(
      items.filter((r) => r.type === 'nap_time'),
      date
    ),
  };
}
