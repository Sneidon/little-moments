/**
 * Export class detail (children roster + activities for a day) to PDF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  pdfAddHeader,
  pdfAddSectionTitle,
  pdfAddFooter,
  PDF_MARGIN,
  PDF_FONT,
  PDF_TABLE_HEAD_STYLES,
  PDF_TABLE_BODY_STYLES,
  PDF_TABLE_ALTERNATE_ROW,
  type DocWithAutoTable,
} from '@/lib/pdfDesign';
import type { ClassRoom } from 'shared/types';
import type { Child } from 'shared/types';
import type { DailyReport } from 'shared/types';
import { REPORT_TYPE_LABELS } from '@/constants/reports';

/** Report with child info for class-level export. */
export type ClassReportRow = DailyReport & { childId: string; childName: string };

export interface ExportClassDetailInclude {
  children?: boolean;
  activities?: boolean;
}

export interface ExportClassDetailOptions {
  classRoom: ClassRoom;
  assignedTeacherName: string;
  children: Child[];
  filterDay: string;
  reportsForDay: ClassReportRow[];
  classDisplayName: string;
  /** Which sections to include. Defaults to all true. */
  include?: ExportClassDetailInclude;
}

const DEFAULT_CLASS_INCLUDE: Required<ExportClassDetailInclude> = {
  children: true,
  activities: true,
};

export function exportClassDetailToPdf(options: ExportClassDetailOptions): void {
  const {
    classRoom,
    assignedTeacherName,
    children,
    filterDay,
    reportsForDay,
    classDisplayName,
  } = options;
  const inc = { ...DEFAULT_CLASS_INCLUDE, ...options.include };
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerRight = 'Class details';

  let y = pdfAddHeader(doc, {
    title: classDisplayName,
    subtitle: `Assigned teacher: ${assignedTeacherName}`,
    meta: `Exported on ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`,
    margin,
    startY: margin,
  });

  if (inc.children) {
  y = pdfAddSectionTitle(doc, 'Children in this class', margin, y);
  if (children.length === 0) {
    doc.setFontSize(PDF_FONT.bodySize);
    doc.text('No children assigned to this class yet.', margin, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Name', 'Preferred', 'Date of birth', 'Allergies']],
      body: children.map((c) => [
        c.name ?? '—',
        c.preferredName ?? '—',
        c.dateOfBirth
          ? new Date(c.dateOfBirth).toLocaleDateString()
          : '—',
        (c.allergies as string[])?.length
          ? (c.allergies as string[]).join(', ')
          : '—',
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: PDF_TABLE_HEAD_STYLES,
      bodyStyles: PDF_TABLE_BODY_STYLES,
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    });
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 10;
  }
  }

  const dateLabel = new Date(filterDay + 'T12:00:00').toLocaleDateString(
    undefined,
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  );

  if (inc.activities) {
  if (y > 230) {
    pdfAddFooter(doc, margin, pageHeight, footerRight);
    doc.addPage();
    y = margin;
  }

  y = pdfAddSectionTitle(
    doc,
    `Activities on ${dateLabel}`,
    margin,
    y
  );
  if (reportsForDay.length === 0) {
    doc.setFontSize(PDF_FONT.bodySize);
    doc.text('No activities recorded for this class on this day.', margin, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Child', 'Type', 'Time', 'Details', 'Notes']],
      body: reportsForDay.map((r) => [
        r.childName ?? '—',
        REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—',
        r.timestamp
          ? new Date(r.timestamp).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
        r.mealOptionName ??
          r.mealType ??
          r.medicationName ??
          r.incidentDetails ??
          '—',
        r.notes ?? '—',
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: PDF_TABLE_HEAD_STYLES,
      bodyStyles: PDF_TABLE_BODY_STYLES,
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    });
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 10;
  }
  }

  pdfAddFooter(doc, margin, pageHeight, footerRight);
  const safeName = classDisplayName.replace(/\s+/g, '-').replace(/[()]/g, '');
  const filename = `class-${safeName}-${filterDay}.pdf`;
  doc.save(filename);
}
