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
import { REPORT_TYPE_LABELS } from '@/constants/reports';
import type { ReportRow } from '@/hooks/useReportsPage';

export interface ExportReportsPdfOptions {
  includeClass?: boolean;
  classDisplay?: (classId: string) => string;
  title?: string;
  filtersApplied?: string;
}

export function exportReportsToPdf(
  rows: ReportRow[],
  options: ExportReportsPdfOptions = {}
): void {
  const { includeClass = true, classDisplay = (id) => id, title = 'Reports', filtersApplied } = options;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();

  const headers = [
    'Child',
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
    const details =
      r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '—';
    return [
      r.childName ?? '—',
      ...(includeClass ? [r.childClassId ? classDisplay(r.childClassId) : '—'] : []),
      REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—',
      time,
      details,
      (r.notes ?? '—').slice(0, 80),
    ];
  });

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
      pageCount > 1 ? `Reports · Page ${p} of ${pageCount}` : 'Reports'
    );
  }

  const filename = `reports-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
