import { Ionicons } from '@expo/vector-icons';
import { formatMealCategoryLabel } from './reportLabels';
import type { DailyReport, MealOption } from '../../../shared/types';

type IonName = keyof typeof Ionicons.glyphMap;

/** Report fields sometimes stored in Firestore beyond DailyReport. */
/** Reports generated for teachers only — hidden from parent activity feeds. */
export const TEACHER_ONLY_REPORT_TYPES = new Set(['child_joined_class']);

export function isParentVisibleReportType(type: string): boolean {
  return !TEACHER_ONLY_REPORT_TYPES.has(type);
}

/** Map meal option id → image URL for resolving meal photos on parent feeds. */
export function buildMealOptionImageMap(options: MealOption[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const opt of options) {
    const url = opt.imageUrl?.trim();
    if (url) map.set(opt.id, url);
  }
  return map;
}

/** Report image: direct `imageUrl`, or meal menu item photo via `mealOptionId`. */
export function resolveReportImageUrl(
  report: { type?: string; imageUrl?: string; mealOptionId?: string | null },
  mealOptionImages?: Map<string, string>
): string | undefined {
  const direct = typeof report.imageUrl === 'string' ? report.imageUrl.trim() : '';
  if (direct) return direct;
  if (report.type !== 'meal' || !report.mealOptionId || !mealOptionImages) return undefined;
  return mealOptionImages.get(report.mealOptionId);
}

export type ReportWithExtras = DailyReport & {
  napStartTime?: string;
  napEndTime?: string;
  activityTitle?: string;
  activityType?: string;
  mealType?: 'breakfast' | 'lunch' | 'snack';
  mealOptionName?: string;
  mediaType?: string;
};

export function getReportTitle(item: ReportWithExtras): string {
  if (item.type === 'meal') {
    return formatMealCategoryLabel(item.mealType) ?? item.mealOptionName ?? 'Meal';
  }
  if (item.type === 'nap_time') return 'Nap Time';
  if (item.type === 'nappy_change') return 'Nappy Change';
  if (item.type === 'check_in') return 'Check In';
  if (item.type === 'check_out') return 'Check Out';
  if (item.type === 'activity') return item.activityTitle || item.activityType || 'Activity';
  if (item.type === 'class_change') {
    const n = item.notes?.trim();
    return n || 'Class update';
  }
  if (item.type === 'child_joined_class') {
    const n = item.notes?.trim();
    return n || 'Joined class';
  }
  if (item.type === 'medication') return item.medicationName || 'Medication';
  if (item.type === 'incident') {
    if (item.mediaType?.toLowerCase().includes('video')) return 'Video';
    return 'Photo';
  }
  return String(item.type).replace('_', ' ');
}

export function reportIcon(type: string): IonName {
  if (type === 'meal') return 'restaurant-outline';
  if (type === 'nap_time') return 'moon-outline';
  if (type === 'nappy_change') return 'water-outline';
  if (type === 'check_in') return 'log-in-outline';
  if (type === 'check_out') return 'log-out-outline';
  if (type === 'activity') return 'sparkles-outline';
  if (type === 'class_change') return 'school-outline';
  if (type === 'child_joined_class') return 'person-add-outline';
  if (type === 'medication') return 'medical-outline';
  if (type === 'incident') return 'camera-outline';
  return 'ellipse-outline';
}

export function reportIconColor(type: string): string {
  if (type === 'meal') return '#ea580c';
  if (type === 'nap_time') return '#7c3aed';
  if (type === 'nappy_change') return '#0d9488';
  if (type === 'check_in') return '#16a34a';
  if (type === 'check_out') return '#b45309';
  if (type === 'activity') return '#ea580c';
  if (type === 'class_change') return '#6A4BB1';
  if (type === 'child_joined_class') return '#16a34a';
  if (type === 'medication') return '#2563eb';
  if (type === 'incident') return '#db2777';
  return '#64748b';
}

/** Parse time-only string (e.g. "13:00") with a date string to get ms. */
export function parseTimeWithDate(timeStr: string | undefined, dateStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  const h = !isNaN(parts[0]) ? parts[0] : 0;
  const m = !isNaN(parts[1]) ? parts[1] : 0;
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function getReportDateStr(r: ReportWithExtras): string {
  const t = r.timestamp ?? r.createdAt;
  if (typeof t === 'string') return t.slice(0, 10);
  if (t && typeof (t as { toDate?: () => Date }).toDate === 'function') {
    return (t as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  return '';
}
