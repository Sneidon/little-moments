import type { RSVPEntry } from '@/hooks/useEventRSVPs';
import { csvRow, downloadCsv, downloadWorkbook, exportDateLabel, todayStamp } from './common';

const HEADERS = ['Parent', 'Response', 'Children & Classes'];

function rsvpRows(entries: RSVPEntry[]) {
  return entries.map((e) => [
    e.displayName ?? e.uid.slice(0, 8) + '…',
    e.response === 'accepted' ? 'Going' : "Can't make it",
    e.children.map((c) => `${c.name} (${c.className})`).join(', ') || '—',
  ]);
}

function fileBase(eventTitle: string) {
  return `rsvps-${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30)}-${todayStamp()}`;
}

export function downloadEventRsvpsCsv(entries: RSVPEntry[], eventTitle: string, eventDate: string): void {
  const lines = ['# Event: ' + eventTitle, '# Date: ' + eventDate, '# Exported: ' + exportDateLabel(), '', csvRow(HEADERS)];
  downloadCsv([...lines, ...rsvpRows(entries).map(csvRow)], `${fileBase(eventTitle)}.csv`);
}

export function exportEventRsvpsToExcel(entries: RSVPEntry[], eventTitle: string, eventDate: string): void {
  const rows = [['Event:', eventTitle], ['Date:', eventDate], ['Exported:', exportDateLabel()], [], HEADERS, ...rsvpRows(entries)];
  downloadWorkbook([{ name: 'RSVPs', rows }], `${fileBase(eventTitle)}.xlsx`);
}
