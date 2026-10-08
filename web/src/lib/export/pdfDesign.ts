import type { jsPDF } from 'jspdf';

export const PDF_BRAND = 'My Little Moments';

export const PDF_MARGIN = {
  portrait: 14,
  landscape: 10,
} as const;

export const PDF_ACCENT_BAR_HEIGHT = 3;

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
  meta: [100, 116, 139] as [number, number, number],
  primary: [109, 40, 217] as [number, number, number],
  accent: [20, 184, 166] as [number, number, number],
  headFill: [109, 40, 217] as [number, number, number],
  headText: 255,
  alternateRow: [248, 250, 252] as [number, number, number],
} as const;

export const PDF_TABLE_HEAD_STYLES = {
  fillColor: PDF_COLOR.headFill,
  textColor: PDF_COLOR.headText,
  fontStyle: 'bold' as const,
  fontSize: PDF_FONT.tableSize,
  cellPadding: 2,
};

export const PDF_TABLE_HEAD_STYLES_COMPACT = {
  ...PDF_TABLE_HEAD_STYLES,
  fontSize: PDF_FONT.tableSizeCompact,
};

export const PDF_TABLE_BODY_STYLES = {
  fontSize: PDF_FONT.tableSize,
  cellPadding: 2,
};

export const PDF_TABLE_BODY_STYLES_COMPACT = {
  fontSize: PDF_FONT.tableSizeCompact,
  cellPadding: 2,
};

export const PDF_TABLE_ALTERNATE_ROW = {
  fillColor: PDF_COLOR.alternateRow,
};

export function pdfDrawAccentBar(doc: jsPDF, margin: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_COLOR.accent);
  doc.rect(0, 0, pageWidth, PDF_ACCENT_BAR_HEIGHT, 'F');
}

/**
 * Draw the standard document header: accent bar (on first page), brand, optional school name, title, meta line.
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
    schoolName?: string;
    drawAccentBar?: boolean;
  }
): number {
  const { title, subtitle, meta, margin, startY = margin, schoolName, drawAccentBar = true } = options;
  let y = startY;

  if (drawAccentBar) {
    pdfDrawAccentBar(doc, margin);
    y += PDF_ACCENT_BAR_HEIGHT + 4;
  }

  doc.setFontSize(PDF_FONT.brandSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLOR.primary);
  doc.text(PDF_BRAND, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  if (schoolName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_FONT.metaSize);
    doc.setTextColor(...PDF_COLOR.meta);
    doc.text(`School: ${schoolName}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

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

export function pdfAddFooter(
  doc: jsPDF,
  margin: number,
  pageHeight: number,
  rightText: string,
  options?: { schoolName?: string }
): void {
  doc.setFontSize(PDF_FONT.footerSize);
  doc.setTextColor(...PDF_COLOR.meta);
  const leftText = options?.schoolName ? `${PDF_BRAND} · ${options.schoolName}` : PDF_BRAND;
  doc.text(leftText, margin, pageHeight - 6);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(rightText, pageWidth - margin, pageHeight - 6, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

export type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

/** Normalize text for jsPDF default fonts (Helvetica lacks many Unicode glyphs). */
export function pdfSafeText(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value)
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}
