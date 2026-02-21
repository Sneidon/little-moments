/**
 * Shared PDF design for all exports. Use these constants and helpers so every
 * PDF has consistent branding, typography, and table styling.
 */
import type { jsPDF } from 'jspdf';

export const PDF_BRAND = 'My Little Moments';

export const PDF_MARGIN = {
  portrait: 14,
  landscape: 10,
} as const;

export const PDF_FONT = {
  brandSize: 18,
  titleSize: 14,
  metaSize: 10,
  sectionSize: 11,
  bodySize: 10,
  tableSize: 9,
  tableSizeCompact: 8,
  footerSize: 8,
} as const;

export const PDF_COLOR = {
  /** Slate for meta text and footer */
  meta: [100, 116, 139] as [number, number, number],
  /** Table header background (slate-600) */
  headFill: [71, 85, 105] as [number, number, number],
  /** Table header text */
  headText: 255,
  /** Alternate row background (slate-50) */
  alternateRow: [248, 250, 252] as [number, number, number],
} as const;

/** Standard table head styles for autoTable */
export const PDF_TABLE_HEAD_STYLES = {
  fillColor: PDF_COLOR.headFill,
  textColor: PDF_COLOR.headText,
  fontStyle: 'bold' as const,
  fontSize: PDF_FONT.tableSize,
  cellPadding: 2,
};

/** Compact table head (e.g. roster) */
export const PDF_TABLE_HEAD_STYLES_COMPACT = {
  ...PDF_TABLE_HEAD_STYLES,
  fontSize: PDF_FONT.tableSizeCompact,
};

/** Standard table body styles */
export const PDF_TABLE_BODY_STYLES = {
  fontSize: PDF_FONT.tableSize,
  cellPadding: 2,
};

export const PDF_TABLE_BODY_STYLES_COMPACT = {
  fontSize: PDF_FONT.tableSizeCompact,
  cellPadding: 2,
};

/** Alternate row style for tables */
export const PDF_TABLE_ALTERNATE_ROW = {
  fillColor: PDF_COLOR.alternateRow,
};

/**
 * Draw the standard document header: brand, title, meta line.
 * Returns the Y position after the header (use as startY for content).
 */
export function pdfAddHeader(
  doc: jsPDF,
  options: {
    title: string;
    subtitle?: string;
    meta: string;
    margin: number;
    startY?: number;
  }
): number {
  const { title, subtitle, meta, margin, startY = margin } = options;
  let y = startY;

  doc.setFontSize(PDF_FONT.brandSize);
  doc.setFont('helvetica', 'bold');
  doc.text(PDF_BRAND, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONT.titleSize);
  doc.text(title, margin, y);
  y += 6;

  if (subtitle) {
    doc.setFontSize(PDF_FONT.bodySize);
    doc.text(subtitle, margin, y);
    y += 5;
  }

  doc.setFontSize(PDF_FONT.metaSize);
  doc.setTextColor(...PDF_COLOR.meta);
  doc.text(meta, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  return y;
}

/**
 * Draw a section title. Returns Y after the title.
 */
export function pdfAddSectionTitle(
  doc: jsPDF,
  text: string,
  margin: number,
  y: number
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONT.sectionSize);
  doc.text(text, margin, y);
  doc.setFont('helvetica', 'normal');
  return y + 7;
}

/**
 * Draw the standard footer on a page (e.g. in didDrawPage).
 */
export function pdfAddFooter(
  doc: jsPDF,
  margin: number,
  pageHeight: number,
  rightText: string
): void {
  doc.setFontSize(PDF_FONT.footerSize);
  doc.setTextColor(...PDF_COLOR.meta);
  doc.text(PDF_BRAND, margin, pageHeight - 6);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(rightText, pageWidth - margin, pageHeight - 6, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

/** Type for doc with lastAutoTable (jspdf-autotable) */
export type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };
