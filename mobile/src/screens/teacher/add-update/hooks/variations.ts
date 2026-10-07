import type { MealOption, ReportType } from '@shared/types';
import { normalizeNappyType } from '../constants';
import type { ChildFormOverrides, UpdateFields } from '../types';

const TYPE_KEYS: Partial<Record<ReportType, (keyof UpdateFields)[]>> = {
  meal: ['mealType', 'mealAmount', 'mealOptionId', 'mealOptionName'],
  nappy_change: ['nappyType', 'nappyCondition'],
  nap_time: ['sleepQuality', 'napStartTime', 'napEndTime'],
  activity: ['activityType', 'activityTitle', 'activityDescription', 'medicationName', 'medicationDosage'],
  medication: ['medicationName', 'medicationDosage', 'activityType', 'activityTitle', 'activityDescription'],
  incident: ['photoCategory'],
};

const TRIMMED: (keyof UpdateFields)[] = ['notes', 'activityTitle', 'activityDescription', 'medicationName', 'medicationDosage'];

const COMPARED: Partial<Record<ReportType, (keyof UpdateFields)[]>> = {
  meal: ['mealType', 'mealAmount', 'mealOptionId'],
  nappy_change: ['nappyType', 'nappyCondition'],
  nap_time: ['sleepQuality', 'napStartTime', 'napEndTime'],
  activity: ['activityType', 'activityTitle', 'activityDescription'],
  medication: ['medicationName', 'medicationDosage'],
  incident: ['photoCategory'],
};

function normalized(key: keyof UpdateFields, value: unknown): unknown {
  if (TRIMMED.includes(key)) return String(value ?? '').trim();
  return value ?? null;
}

export function effectiveValues(
  fields: UpdateFields,
  override: ChildFormOverrides | undefined,
  mealOptions: MealOption[]
): UpdateFields {
  const merged = { ...fields, ...override };
  const option = mealOptions.find((o) => o.id === fields.mealOptionId);
  return {
    ...merged,
    nappyType: normalizeNappyType(merged.nappyType),
    mealOptionName: override?.mealOptionName ?? option?.name ?? fields.mealOptionName,
    activityTitle: merged.activityTitle.trim(),
    activityDescription: merged.activityDescription.trim(),
    medicationName: merged.medicationName.trim(),
    medicationDosage: merged.medicationDosage.trim(),
    notes: merged.notes.trim(),
  };
}

export function diffOverride(
  type: ReportType,
  main: UpdateFields,
  draft: UpdateFields,
  existing: ChildFormOverrides | undefined
): ChildFormOverrides {
  const next: ChildFormOverrides = { ...existing };
  for (const key of [...(TYPE_KEYS[type] ?? []), 'notes' as const]) delete next[key];

  for (const key of [...(COMPARED[type] ?? []), 'notes' as const]) {
    if (normalized(key, draft[key]) !== normalized(key, main[key])) {
      (next as Record<string, unknown>)[key] = normalized(key, draft[key]);
    }
  }
  if (type === 'meal' && next.mealOptionId && draft.mealOptionName) next.mealOptionName = draft.mealOptionName;

  return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as ChildFormOverrides;
}
