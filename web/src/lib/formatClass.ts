import type { ClassRoom } from 'shared/types';

/** Format age in months as "X mo" or "X yr" (2 years or more = yr). */
export function formatAgeMonths(months: number | null | undefined): string {
  if (months == null) return '—';
  const m = Number(months);
  if (Number.isNaN(m)) return '—';
  if (m >= 24) return `${Math.round(m / 12)} yr`;
  return `${m} mo`;
}

/** Display class name with age range where shown (e.g. "Rainbow Room (2 yr – 4 yr)"). */
export function formatClassDisplay(c: ClassRoom | null | undefined): string {
  if (!c?.name) return '—';
  const min = c.minAgeMonths != null ? formatAgeMonths(c.minAgeMonths) : null;
  const max = c.maxAgeMonths != null ? formatAgeMonths(c.maxAgeMonths) : null;
  if (min && max) return `${c.name} (${min} – ${max})`;
  if (min) return `${c.name} (from ${min})`;
  if (max) return `${c.name} (up to ${max})`;
  return c.name;
}

/** Format age from date of birth (ISO string). Returns "—" if invalid or missing. */
export function ageFromDob(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return '—';
  try {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    return formatAgeMonths(months);
  } catch {
    return '—';
  }
}
