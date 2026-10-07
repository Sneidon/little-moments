import type { Ionicons } from '@expo/vector-icons';
import { formatMealAmount } from '@shared/reportLabels';
import { formatTime, toIso } from '../../utils';

export type ReportDoc = Record<string, unknown>;
export type DetailRow = { label: string; value: string };

export function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v || undefined;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function mapped(v: unknown, map: Record<string, string>, fallback = (s: string) => s): string | undefined {
  const s = str(v);
  return s ? (map[s] ?? fallback(s)) : undefined;
}

const NAPPY_TYPES: Record<string, string> = { wet: 'Wet', dry: 'Dry', dirty: 'Dry', normal: 'Normal' };
const NAPPY_CONDITIONS: Record<string, string> = { normal: 'Normal', rash: 'Rash', irritated: 'Irritated' };
const SLEEP_QUALITY: Record<string, string> = {
  excellent: 'Excellent — slept soundly',
  good: 'Good — fell asleep easily',
  fair: 'Fair — took time to settle',
  poor: 'Poor — restless sleep',
};

const TYPE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  meal: { label: 'Meal', icon: 'restaurant-outline', color: '#ea580c' },
  nap_time: { label: 'Nap', icon: 'moon-outline', color: '#7c3aed' },
  nappy_change: { label: 'Nappy change', icon: 'water-outline', color: '#0d9488' },
  check_in: { label: 'Check in', icon: 'log-in-outline', color: '#16a34a' },
  check_out: { label: 'Check out', icon: 'log-out-outline', color: '#b45309' },
  activity: { label: 'Activity', icon: 'sparkles-outline', color: '#ea580c' },
  class_change: { label: 'Class update', icon: 'school-outline', color: '#6A4BB1' },
  child_joined_class: { label: 'Joined class', icon: 'person-add-outline', color: '#16a34a' },
  medication: { label: 'Medication', icon: 'medical-outline', color: '#2563eb' },
  incident: { label: 'Photo / moment', icon: 'camera-outline', color: '#db2777' },
};

export function reportTypeMeta(type: string) {
  return TYPE_META[type] ?? { label: type.replace(/_/g, ' '), icon: 'document-text-outline' as const, color: undefined };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDuration(mins: unknown): string | undefined {
  if (typeof mins !== 'number' || mins <= 0) return undefined;
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

function typeRows(type: string, d: ReportDoc): [string, string | null | undefined][] {
  switch (type) {
    case 'meal': {
      const mealType = str(d.mealType);
      return [
        ['Meal', mealType && capitalize(mealType)],
        ['Option', str(d.mealOptionName)],
        ['Amount eaten', formatMealAmount(str(d.mealAmount))],
      ];
    }
    case 'nappy_change':
      return [
        ['Type', mapped(d.nappyType, NAPPY_TYPES)],
        ['Condition', mapped(d.nappyCondition, NAPPY_CONDITIONS)],
      ];
    case 'nap_time':
      return [
        ['Nap start', str(d.napStartTime)],
        ['Nap end', str(d.napEndTime)],
        ['Duration', formatDuration(d.napDurationMinutes)],
        ['Sleep quality', mapped(d.sleepQuality, SLEEP_QUALITY, (s) => capitalize(s).replace(/_/g, ' '))],
      ];
    case 'activity':
      return [
        ['Activity type', str(d.activityType)],
        ['Title', str(d.activityTitle)],
      ];
    case 'medication':
      return [
        ['Medication', str(d.medicationName)],
        ['Dosage', str(d.medicationDosage)],
      ];
    case 'incident': {
      const shared = d.forWholeClass === true ? 'Whole class' : d.forWholeClass === false ? 'This child’s family' : undefined;
      return [
        ['Category', str(d.photoCategory)],
        ['Details', str(d.incidentDetails)],
        ['Shared with', shared],
      ];
    }
    default:
      return [];
  }
}

function formatLoggedAt(ts: string) {
  const date = new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatTime(ts)} · ${date}`;
}

export function buildDetailRows(data: ReportDoc, childName: string | null, reporterName: string | null): DetailRow[] {
  const type = str(data.type) ?? 'update';
  const ts = toIso(data.timestamp) || toIso(data.createdAt);
  const entries: [string, string | null | undefined][] = [
    ['Time logged', ts ? formatLoggedAt(ts) : undefined],
    ['Child', childName],
    ['Logged by', reporterName],
    ...typeRows(type, data),
    ['Notes', str(data.notes)],
  ];
  return entries.filter((e): e is [string, string] => !!e[1]).map(([label, value]) => ({ label, value }));
}
