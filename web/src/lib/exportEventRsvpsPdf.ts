/**
 * Export event RSVP list to PDF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  pdfAddHeader,
  pdfAddFooter,
  PDF_MARGIN,
  PDF_TABLE_HEAD_STYLES_COMPACT,
  PDF_TABLE_BODY_STYLES_COMPACT,
  PDF_TABLE_ALTERNATE_ROW,
} from '@/lib/pdfDesign';
import type { RSVPEntry } from '@/hooks/useEventRSVPs';

export function exportEventRsvpsToPdf(
  entries: RSVPEntry[],
  eventTitle: string,
  eventDate: string
): void {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();

  const headers = ['Parent', 'Response', 'Children & Classes'];
  const body = entries.map((e) => {
    const childrenStr = e.children
      .map((c) => `${c.name} (${c.className})`)
      .join(', ') || '—';
    return [
      (e.displayName ?? e.uid.slice(0, 8) + '…').slice(0, 40),
      e.response === 'accepted' ? 'Going' : "Can't make it",
      childrenStr.slice(0, 80),
    ];
  });

  let y = pdfAddHeader(doc, {
    title: `RSVPs: ${eventTitle}`,
    subtitle: eventDate,
    meta: `Exported on ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${entries.length} ${entries.length === 1 ? 'RSVP' : 'RSVPs'}`,
    margin,
    startY: margin,
  });

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: PDF_TABLE_HEAD_STYLES_COMPACT,
    bodyStyles: PDF_TABLE_BODY_STYLES_COMPACT,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    pdfAddFooter(
      doc,
      margin,
      pageHeight,
      pageCount > 1 ? `RSVPs · Page ${p} of ${pageCount}` : 'RSVPs'
    );
  }

  const slug = eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const filename = `rsvps-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
