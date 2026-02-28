import type { RSVPEntry } from '@/hooks/useEventRSVPs';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Build CSV string from RSVP entries and trigger download. */
export function downloadEventRsvpsCsv(
  entries: RSVPEntry[],
  eventTitle: string,
  eventDate: string
): void {
  const lines: string[] = [];
  lines.push('# Event: ' + eventTitle);
  lines.push('# Date: ' + eventDate);
  lines.push('# Exported: ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
  lines.push('');

  const headers = ['Parent', 'Response', 'Children & Classes'];
  lines.push(headers.map(escapeCsvCell).join(','));

  for (const e of entries) {
    const childrenStr = e.children
      .map((c) => `${c.name} (${c.className})`)
      .join(', ') || '—';
    const row = [
      e.displayName ?? e.uid.slice(0, 8) + '…',
      e.response === 'accepted' ? 'Going' : "Can't make it",
      childrenStr,
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const slug = eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const name = `rsvps-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
