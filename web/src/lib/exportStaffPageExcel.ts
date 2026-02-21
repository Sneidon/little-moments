import * as XLSX from 'xlsx';
import type { ParentWithChildren, StaffRowForPdf } from '@/lib/exportStaffPagePdf';

export interface ExportStaffPageExcelOptions {
  staff?: StaffRowForPdf[];
  parents?: ParentWithChildren[];
  include?: { staff?: boolean; parents?: boolean };
  schoolName?: string;
}

const DEFAULT_INCLUDE = { staff: true, parents: true };

/** Export staff and/or parents to Excel (.xlsx) and trigger download. */
export function exportStaffPageToExcel(options: ExportStaffPageExcelOptions): void {
  const { schoolName, staff = [], parents = [] } = options;
  const inc = { ...DEFAULT_INCLUDE, ...options.include };
  const wb = XLSX.utils.book_new();
  const exportDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (inc.staff && staff.length > 0) {
    const staffHeaders = ['Name', 'Preferred name', 'Email', 'Role', 'Status', 'Assigned class'];
    const staffRows = staff.map((u) => [
      u.displayName ?? '',
      u.preferredName ?? '',
      u.email ?? '',
      u.role ?? '',
      u.role === 'teacher' ? (u.isActive !== false ? 'Active' : 'Inactive') : '',
      (u as StaffRowForPdf).assignedClass ?? '',
    ]);
    const staffData = [['Exported:', exportDate], ...(schoolName ? [['School:', schoolName], []] : []), staffHeaders, ...staffRows];
    const ws = XLSX.utils.aoa_to_sheet(staffData);
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
  }

  if (inc.parents && parents.length > 0) {
    const parentHeaders = ['Name', 'Email', 'Phone', 'Status', 'Linked children'];
    const parentRows = parents.map((p) => [
      p.displayName ?? '',
      p.email ?? '',
      p.phone ?? '',
      p.isActive !== false ? 'Active' : 'Inactive',
      p.children?.length ? p.children.map((c) => c.name || c.id).join(', ') : '',
    ]);
    const parentData = [['Exported:', exportDate], ...(schoolName ? [['School:', schoolName], []] : []), parentHeaders, ...parentRows];
    const ws = XLSX.utils.aoa_to_sheet(parentData);
    XLSX.utils.book_append_sheet(wb, ws, 'Parents');
  }

  const safeName = (schoolName ?? 'school').replace(/\s+/g, '-').replace(/[()]/g, '');
  const filename =
    inc.parents && !inc.staff
      ? `parents-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`
      : inc.staff && !inc.parents
        ? `staff-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `staff-and-parents-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
