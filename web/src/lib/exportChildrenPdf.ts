/**
 * Export children list to a multi-page PDF. Handles hundreds of records by
 * using jspdf-autotable's built-in page breaks and compact styling.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  pdfAddHeader,
  pdfAddFooter,
  PDF_MARGIN,
  PDF_TABLE_HEAD_STYLES_COMPACT,
  PDF_TABLE_BODY_STYLES_COMPACT,
  PDF_TABLE_ALTERNATE_ROW,
} from '@/lib/pdfDesign';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export type ClassDisplayFn = (classId: string) => string;

function safeStr(value: unknown): string {
  if (value == null) return '—';
  const s = String(value).trim();
  return s || '—';
}

function formatDob(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return '—';
  try {
    return new Date(dateOfBirth).toLocaleDateString();
  } catch {
    return dateOfBirth;
  }
}

/**
 * Build and download a PDF of the children roster. Safe for large lists (hundreds
 * of rows); autoTable splits across pages and repeats the header on each page.
 */
export function exportChildrenToPdf(
  children: Child[],
  classes: ClassRoom[],
  classDisplay: ClassDisplayFn,
  options?: { onProgress?: (message: string) => void }
): void {
  const onProgress = options?.onProgress ?? (() => {});

  if (children.length === 0) {
    onProgress('No children to export.');
    onProgress('');
    return;
  }

  onProgress('Preparing PDF…');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN.landscape;

  const head = [['Name', 'Preferred', 'DOB', 'Class', 'Allergies', 'Emergency']];
  const body = children.map((c) => [
    safeStr(c.name),
    safeStr(c.preferredName),
    formatDob(c.dateOfBirth),
    c.classId ? classDisplay(c.classId) : '—',
    c.allergies?.length ? c.allergies.join(', ') : '—',
    c.emergencyContactName || c.emergencyContact ? safeStr(c.emergencyContactName || c.emergencyContact) : '—',
  ]);

  const startY = pdfAddHeader(doc, {
    title: 'Children roster',
    meta: `Exported ${new Date().toLocaleDateString()} · ${children.length} children`,
    margin,
    startY: 12,
  });

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    styles: PDF_TABLE_BODY_STYLES_COMPACT,
    headStyles: PDF_TABLE_HEAD_STYLES_COMPACT,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 36 },
      4: { cellWidth: 40 },
      5: { cellWidth: 38 },
    },
    didDrawPage: () => {
      pdfAddFooter(doc, margin, pageHeight, `${children.length} children`);
    },
    showHead: 'everyPage',
  });

  onProgress('Saving…');
  const filename = `children-roster-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  onProgress('');
}
