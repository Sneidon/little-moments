import type { ReportType } from '@shared/types';
import type { MealType, UpdateFields } from './types';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snack' },
];

export const MEAL_AMOUNTS = [
  { value: 'none', label: 'None', circleText: 'None' },
  { value: 'little', label: 'A little', circleText: 'Little' },
  { value: 'half', label: 'Half', circleText: 'Half' },
  { value: 'most', label: 'Most', circleText: 'Most' },
  { value: 'all', label: 'All', circleText: 'All' },
];

export const ACTIVITY_TABS: { type: ReportType; label: string }[] = [
  { type: 'check_in', label: 'Check in' },
  { type: 'check_out', label: 'Check out' },
  { type: 'meal', label: 'Meal' },
  { type: 'nap_time', label: 'Nap' },
  { type: 'nappy_change', label: 'Nappy' },
  { type: 'medication', label: 'Medication' },
  { type: 'activity', label: 'Activity' },
  { type: 'incident', label: 'Media' },
];

export const NAPPY_TYPES = [
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'normal', label: 'Normal' },
];

export const NAPPY_CONDITIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'rash', label: 'Rash' },
  { value: 'irritated', label: 'Irritated' },
];

export const SLEEP_QUALITY_OPTIONS = [
  { value: 'excellent', label: 'Excellent - Slept soundly' },
  { value: 'good', label: 'Good - Fell asleep easily' },
  { value: 'fair', label: 'Fair - Took time to settle' },
  { value: 'poor', label: 'Poor - Restless sleep' },
  { value: 'none', label: 'Did not sleep' },
];

export const ACTIVITY_TYPES = [
  'Art & Crafts',
  'Music & Movement',
  'Outdoor Play',
  'Reading & Story Time',
  'Science & Discovery',
  'Dramatic Play',
  'Sensory Play',
  'Other',
].map((v) => ({ value: v, label: v }));

export const PHOTO_CATEGORIES = ['Meals', 'Outdoor Play', 'Art Projects', 'With Friends', 'Other'].map((v) => ({
  value: v,
  label: v,
}));

export function normalizeNappyType(value: string | undefined): string {
  if (!value) return 'wet';
  return value === 'dirty' ? 'dry' : value;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function clockToDate(timeStr: string): Date {
  const now = new Date();
  const [h, m] = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  const d = new Date();
  d.setHours(isNaN(h) ? now.getHours() : h, isNaN(m) ? now.getMinutes() : m, 0, 0);
  return d;
}

export function defaultFields(): UpdateFields {
  const now = formatClock(new Date());
  return {
    mealType: 'lunch',
    mealAmount: 'half',
    mealOptionId: null,
    mealOptionName: '',
    nappyType: 'wet',
    nappyCondition: 'normal',
    napStartTime: now,
    napEndTime: now,
    sleepQuality: 'good',
    activityType: null,
    activityTitle: '',
    activityDescription: '',
    medicationName: '',
    medicationDosage: '',
    notes: '',
    photoCategory: null,
  };
}
