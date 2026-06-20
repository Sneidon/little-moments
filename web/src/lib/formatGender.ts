import type { ChildGender } from 'shared/types';

export const GENDER_FORM_OPTIONS: { value: ChildGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const GENDER_LABELS: Record<ChildGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export function formatGenderLabel(gender: ChildGender | undefined | null): string {
  if (!gender) return '—';
  return GENDER_LABELS[gender] ?? '—';
}
