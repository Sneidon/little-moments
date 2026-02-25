import * as XLSX from 'xlsx';
import type { RSVPEntry } from '@/hooks/useEventRSVPs';

/** Export RSVP entries to Excel (.xlsx) and trigger download. */
export function exportEventRsvpsToExcel(
  entries: RSVPEntry[],
  eventTitle: string,
  eventDate: string
): void {
  const headers = ['Parent', 'Response', 'Children & Classes'];
  const dataRows = entries.map((e) => {
    const childrenStr = e.children
      .map((c) => `${c.name} (${c.className})`)
      .join(', ') || '—';
    return [
      e.displayName ?? e.uid.slice(0, 8) + '…',
      e.response === 'accepted' ? 'Going' : "Can't make it",
      childrenStr,
    ];
  });

  const exportDate = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const tableRows: (string[] | (string | number)[])[] = [
    ['Event:', eventTitle],
    ['Date:', eventDate],
    ['Exported:', exportDate],
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(tableRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RSVPs');
  const slug = eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const filename = `rsvps-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
