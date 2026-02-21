/**
 * Export children list to a multi-page PDF. Handles hundreds of records by
 * using jspdf-autotable's built-in page breaks and compact styling.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

const FONT_SIZE = 8;
const BRAND = 'My Little Moments';

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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  const head = [['Name', 'Preferred', 'DOB', 'Class', 'Allergies', 'Emergency']];
  const body = children.map((c) => [
    safeStr(c.name),
    safeStr(c.preferredName),
    formatDob(c.dateOfBirth),
    c.classId ? classDisplay(c.classId) : '—',
    c.allergies?.length ? c.allergies.join(', ') : '—',
    c.emergencyContactName || c.emergencyContact ? safeStr(c.emergencyContactName || c.emergencyContact) : '—',
  ]);

  // Branding and title (first page)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND, margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Children roster', margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported ${new Date().toLocaleDateString()} · ${children.length} children`, margin, 24);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    head,
    body,
    startY: 28,
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    styles: {
      fontSize: FONT_SIZE,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 36 },
      4: { cellWidth: 40 },
      5: { cellWidth: 38 },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(BRAND, margin, pageHeight - 6);
      doc.text(
        `${children.length} children`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      );
    },
    // Ensure header row repeats on each new page (default in autoTable)
    showHead: 'everyPage',
  });

  onProgress('Saving…');
  const filename = `children-roster-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  onProgress('');
}
