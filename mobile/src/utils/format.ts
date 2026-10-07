export { getAge, getInitials } from '@shared/format';

export function formatDateDisplay(isoDate: string, options?: { todayLabel?: string }): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return options?.todayLabel ?? 'Today';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

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

export function toIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}
