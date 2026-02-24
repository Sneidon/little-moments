/**
 * Shared formatting utilities for mobile app.
 */

/** Format dateOfBirth (ISO date string) as age, e.g. "2 years" or "11 mo". */
export function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

/** Get up to 2 initials from a name. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

/** Format ISO date string for display: "Today" or "Mon, Jan 15". */
export function formatDateDisplay(isoDate: string, options?: { todayLabel?: string }): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return options?.todayLabel ?? 'Today';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Format ISO timestamp as time, e.g. "2:30 PM". */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
