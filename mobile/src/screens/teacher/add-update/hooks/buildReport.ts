import type { MealOption, ReportType } from '@shared/types';
import { parseTimeWithDate } from '../../../../utils/childDailyReportDisplay';
import type { UpdateFields } from '../types';

export function validateValues(type: ReportType, v: UpdateFields, childName: string): [string, string] | null {
  if (type === 'activity') {
    if (!v.activityType) return ['Activity type', 'Select an activity type before posting.'];
    if (!v.activityTitle) return ['Title required', 'Enter a short title for this activity.'];
  }
  if (type === 'medication') {
    if (!v.medicationName) return ['Medication name', 'Enter the name of the medication.'];
    if (!v.medicationDosage) return ['Dosage required', 'Enter the dosage administered (e.g. 5 ml, 1 tablet).'];
  }
  if (type === 'nap_time') {
    if (!v.napStartTime?.trim() || !v.napEndTime?.trim()) return ['Nap times', `Enter start and end times for ${childName}.`];
    const today = new Date().toISOString().slice(0, 10);
    const startMs = parseTimeWithDate(v.napStartTime, today);
    const endMs = parseTimeWithDate(v.napEndTime, today);
    if (isNaN(startMs) || isNaN(endMs)) return ['Nap times', `Invalid time for ${childName}.`];
    if (endMs < startMs) return ['Nap times', `End time must be after start time for ${childName}.`];
  }
  return null;
}

type BuildArgs = {
  type: ReportType;
  childId: string;
  schoolId: string;
  reportedBy: string;
  now: string;
  values: UpdateFields;
  mealOptions: MealOption[];
  media: { url: string | null; mediaType?: string; forWholeClass: boolean };
};

export function buildReport({ type, childId, schoolId, reportedBy, now, values: v, mealOptions, media }: BuildArgs) {
  const payload: Record<string, unknown> = { childId, schoolId, type, reportedBy, timestamp: now, createdAt: now };
  if (type !== 'meal') payload.notes = v.notes || undefined;
  if (type === 'meal') {
    payload.mealType = v.mealType;
    payload.mealAmount = v.mealAmount;
    if (v.mealOptionId) {
      const option = mealOptions.find((o) => o.id === v.mealOptionId);
      payload.mealOptionId = v.mealOptionId;
      payload.mealOptionName = option?.name ?? v.mealOptionName;
      if (option?.imageUrl?.trim()) payload.imageUrl = option.imageUrl.trim();
    }
  }
  if (type === 'nappy_change') {
    payload.nappyType = v.nappyType;
    payload.nappyCondition = v.nappyCondition;
  }
  if (type === 'nap_time') {
    payload.napStartTime = v.napStartTime;
    payload.napEndTime = v.napEndTime;
    payload.sleepQuality = v.sleepQuality;
  }
  if (type === 'activity') {
    payload.activityType = v.activityType || undefined;
    payload.activityTitle = v.activityTitle || undefined;
    if (v.activityDescription) payload.notes = v.activityDescription;
  }
  if (type === 'medication') {
    payload.medicationName = v.medicationName || undefined;
    payload.medicationDosage = v.medicationDosage || undefined;
  }
  if (type === 'incident') {
    if (media.url) payload.imageUrl = media.url;
    if (media.mediaType) payload.mediaType = media.mediaType;
    if (media.forWholeClass) payload.forWholeClass = true;
    if (v.photoCategory) payload.photoCategory = v.photoCategory;
  }
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
