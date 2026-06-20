/**
 * Export reports table to PDF.
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
  type DocWithAutoTable,
} from '@/lib/pdfDesign';
import { getReportDetailsSummary, getReportNotesSummary, getReportTypeLabel } from '@/lib/reports';
import { formatGenderLabel } from '@/lib/formatGender';
import type { ReportRow } from '@/hooks/useReportsPage';

export interface ExportReportsPdfOptions {
  includeClass?: boolean;
  classDisplay?: (classId: string) => string;
  title?: string;
  filtersApplied?: string;
  /** School name for header/footer when applicable */
  schoolName?: string;
}

export function exportReportsToPdf(
  rows: ReportRow[],
  options: ExportReportsPdfOptions = {}
): void {
  const { includeClass = true, classDisplay = (id) => id, title = 'Reports', filtersApplied, schoolName } = options;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();

  const headers = [
    'Child',
    'Gender',
    ...(includeClass ? ['Class'] : []),
    'Type',
    'Time',
    'Details',
    'Notes',
  ];
  const body = rows.map((r) => {
    const date = r.timestamp
      ? new Date(r.timestamp).toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : '';
    const time = r.timestamp
      ? new Date(r.timestamp).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const details = getReportDetailsSummary(r);
    return [
      r.childName ?? '—',
      formatGenderLabel(r.childGender),
      ...(includeClass ? [r.childClassId ? classDisplay(r.childClassId) : '—'] : []),
      getReportTypeLabel(r),
      time,
      details,
      getReportNotesSummary(r),
    ];
  });

  const notesColIndex = headers.length - 1;
  const columnStyles: Record<number, { cellWidth: number }> = includeClass
    ? {
        0: { cellWidth: 24 },
        1: { cellWidth: 14 },
        2: { cellWidth: 22 },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        5: { cellWidth: 28 },
        [notesColIndex]: { cellWidth: 38 },
      }
    : {
        0: { cellWidth: 26 },
        1: { cellWidth: 14 },
        2: { cellWidth: 20 },
        3: { cellWidth: 16 },
        4: { cellWidth: 30 },
        [notesColIndex]: { cellWidth: 44 },
      };

  let y = pdfAddHeader(doc, {
    title,
    subtitle: filtersApplied ? `Filters: ${filtersApplied}` : undefined,
    meta: `Exported on ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${rows.length} ${rows.length === 1 ? 'report' : 'reports'}`,
    margin,
    startY: margin,
    schoolName,
  });

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { overflow: 'linebreak', cellPadding: 2 },
    headStyles: PDF_TABLE_HEAD_STYLES_COMPACT,
    bodyStyles: PDF_TABLE_BODY_STYLES_COMPACT,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    columnStyles,
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    pdfAddFooter(
      doc,
      margin,
      pageHeight,
      pageCount > 1 ? `Reports · Page ${p} of ${pageCount}` : 'Reports',
      { schoolName }
    );
  }

  const filename = `reports-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
