/**
 * Export staff and/or parents list to PDF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  pdfAddHeader,
  pdfAddSectionTitle,
  pdfAddFooter,
  PDF_MARGIN,
  PDF_TABLE_HEAD_STYLES,
  PDF_TABLE_BODY_STYLES,
  PDF_TABLE_ALTERNATE_ROW,
  type DocWithAutoTable,
} from '@/lib/pdfDesign';
import type { UserProfile } from 'shared/types';
import type { Child } from 'shared/types';

export interface ParentWithChildren extends UserProfile {
  children: Child[];
}

export interface StaffRowForPdf extends UserProfile {
  assignedClass?: string;
}

export interface ExportStaffPageOptions {
  schoolName?: string;
  staff?: StaffRowForPdf[];
  parents?: ParentWithChildren[];
  include?: { staff?: boolean; parents?: boolean };
}

const DEFAULT_INCLUDE = { staff: true, parents: true };

export function exportStaffPageToPdf(options: ExportStaffPageOptions): void {
  const { schoolName = 'School', staff = [], parents = [] } = options;
  const inc = { ...DEFAULT_INCLUDE, ...options.include };
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = PDF_MARGIN.portrait;
  const pageHeight = doc.internal.pageSize.getHeight();
  const onlyParents = inc.parents && !inc.staff;
  const onlyStaff = inc.staff && !inc.parents;
  const footerRight = onlyParents ? 'Parents' : onlyStaff ? 'Staff' : 'Staff & parents';
  const title = onlyParents ? `${schoolName} – Parents` : onlyStaff ? `${schoolName} – Staff & teachers` : `${schoolName} – Staff & parents`;

  let y = pdfAddHeader(doc, {
    title,
    meta: `Exported on ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`,
    margin,
    startY: margin,
  });

  if (inc.staff && staff.length > 0) {
    y = pdfAddSectionTitle(doc, 'Staff & teachers', margin, y);
    autoTable(doc, {
      startY: y,
      head: [['Name', 'Preferred name', 'Email', 'Role', 'Status', 'Assigned class']],
      body: staff.map((u) => [
        u.displayName ?? '—',
        u.preferredName ?? '—',
        u.email ?? '—',
        u.role ?? '—',
        u.role === 'teacher' ? (u.isActive !== false ? 'Active' : 'Inactive') : '—',
        (u as StaffRowForPdf).assignedClass ?? '—',
      ]),
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: PDF_TABLE_HEAD_STYLES,
      bodyStyles: PDF_TABLE_BODY_STYLES,
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW,
    });
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 14;
  }

  if (inc.parents && parents.length > 0) {
    if (y > 200) {
      pdfAddFooter(doc, margin, pageHeight, footerRight);
      doc.addPage();
      y = margin;
    }
    y = pdfAddSectionTitle(doc, 'Parents', margin, y);
    autoTable(doc, {
      startY: y,
      head: [['Name', 'Email', 'Phone', 'Status', 'Linked children']],
      body: parents.map((p) => [
        p.displayName ?? '—',
        p.email ?? '—',
        p.phone ?? '—',
        p.isActive !== false ? 'Active' : 'Inactive',
        p.children?.length
          ? p.children.map((c) => c.name || c.id).join(', ')
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

  pdfAddFooter(doc, margin, pageHeight, footerRight);
  const safeName = schoolName.replace(/\s+/g, '-').replace(/[()]/g, '');
  const filename = onlyParents
    ? `parents-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`
    : onlyStaff
      ? `staff-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`
      : `staff-and-parents-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
