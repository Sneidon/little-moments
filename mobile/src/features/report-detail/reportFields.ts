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

const TYPE_LABELS: Record<string, string> = {
  meal: 'Meal',
  nap_time: 'Nap',
  nappy_change: 'Nappy change',
  check_in: 'Check in',
  check_out: 'Check out',
  activity: 'Activity',
  class_change: 'Class update',
  child_joined_class: 'Joined class',
  medication: 'Medication',
  incident: 'Photo / moment',
};

export function reportTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? capitalize(type.replace(/_/g, ' '));
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

export type ReportDetail = {
  time?: string;
  date?: string;
  people: DetailRow[];
  details: DetailRow[];
  notes?: string;
};

function rows(entries: [string, string | null | undefined][]): DetailRow[] {
  return entries.filter((e): e is [string, string] => !!e[1]).map(([label, value]) => ({ label, value }));
}

export function buildReportDetail(data: ReportDoc, childName: string | null, reporterName: string | null): ReportDetail {
  const ts = toIso(data.timestamp) || toIso(data.createdAt);
  return {
    time: ts ? formatTime(ts) : undefined,
    date: ts ? new Date(ts).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined,
    people: rows([
      ['Child', childName],
      ['Logged by', reporterName],
    ]),
    details: rows(typeRows(str(data.type) ?? 'update', data)),
    notes: str(data.notes),
  };
}
