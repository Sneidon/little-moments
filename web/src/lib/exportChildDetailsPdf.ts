/**
 * Export a single child's details (profile, parents, activity summary) to PDF.
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
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import type { DailyReport } from 'shared/types';
import type { UserProfile } from 'shared/types';
import { ageFromDob } from '@/lib/formatClass';

export type ClassDisplayFn = (classId: string | null | undefined) => string;

export interface ExportChildDetailsInclude {
  profile?: boolean;
  parents?: boolean;
  activitySummary?: boolean;
}

export interface ExportChildDetailsOptions {
  child: Child;
  classes: ClassRoom[];
  parents: UserProfile[];
  reports: DailyReport[];
  classDisplay: ClassDisplayFn;
  /** Which sections to include. Defaults to all true. */
  include?: ExportChildDetailsInclude;
}

const DEFAULT_CHILD_INCLUDE: Required<ExportChildDetailsInclude> = {
  profile: true,
  parents: true,
  activitySummary: true,
};

export function exportChildDetailsToPdf(options: ExportChildDetailsOptions): void {
  const { child, classes, parents, reports, classDisplay } = options;
  const inc = { ...DEFAULT_CHILD_INCLUDE, ...options.include };
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerRight = 'Child details';

  const subtitle = child.name + (child.preferredName ? ` "${child.preferredName}"` : '');
  let y = pdfAddHeader(doc, {
    title: 'Child details',
    subtitle,
    meta: `Exported on ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
    margin,
    startY: margin,
  });

  if (inc.profile) {
  y = pdfAddSectionTitle(doc, 'Profile', margin, y);
  doc.setFontSize(PDF_FONT.bodySize);
  const profileRows: [string, string][] = [
    ['Age', ageFromDob(child.dateOfBirth)],
    ['Date of birth', child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'],
    ['Class', classDisplay(child.classId)],
    ['Enrollment date', child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : '—'],
  ];
  if (child.allergies?.length) {
    profileRows.push(['Allergies', (child.allergies as string[]).join(', ')]);
  }
  if (child.medicalNotes) {
    profileRows.push(['Medical notes', child.medicalNotes]);
  }
  if (child.emergencyContactName || child.emergencyContact) {
    profileRows.push([
      'Emergency contact',
      [child.emergencyContactName, child.emergencyContact].filter(Boolean).join(' · '),
    ]);
  }
  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: profileRows,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: PDF_TABLE_HEAD_STYLES,
    bodyStyles: PDF_TABLE_BODY_STYLES,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 'auto' } },
  });
  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 10;
  }

  if (inc.parents && parents.length > 0) {
    if (y > 240) {
      pdfAddFooter(doc, margin, pageHeight, footerRight);
      doc.addPage();
      y = margin;
    }
    y = pdfAddSectionTitle(doc, 'Parents', margin, y);
    autoTable(doc, {
      startY: y,
      head: [['Name', 'Email', 'Phone', 'Status']],
      body: parents.map((p) => [
        p.displayName ?? '—',
        p.email,
        p.phone ?? '—',
        p.isActive !== false ? 'Active' : 'Inactive',
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: PDF_TABLE_HEAD_STYLES,
      bodyStyles: PDF_TABLE_BODY_STYLES,
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    });
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 10;
  }

  if (inc.activitySummary) {
  if (y > 250) {
    pdfAddFooter(doc, margin, pageHeight, footerRight);
    doc.addPage();
    y = margin;
  }
  y = pdfAddSectionTitle(doc, 'Activity summary', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONT.bodySize);
  doc.text(`${reports.length} ${reports.length === 1 ? 'activity' : 'activities'} total.`, margin, y);
  y += 6;
  if (reports[0]?.timestamp) {
    doc.text(
      `Last activity: ${new Date(reports[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`,
      margin,
      y
    );
  }
  }

  pdfAddFooter(doc, margin, pageHeight, footerRight);
  const filename = `child-details-${child.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
