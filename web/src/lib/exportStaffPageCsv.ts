import type { ParentWithChildren, StaffRowForPdf } from '@/lib/exportStaffPagePdf';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export interface ExportStaffPageCsvOptions {
  staff?: StaffRowForPdf[];
  parents?: ParentWithChildren[];
  include?: { staff?: boolean; parents?: boolean };
  schoolName?: string;
}

const DEFAULT_INCLUDE = { staff: true, parents: true };

/** Build CSV for staff and/or parents and trigger download. */
export function exportStaffPageToCsv(options: ExportStaffPageCsvOptions): void {
  const { schoolName, staff = [], parents = [] } = options;
  const inc = { ...DEFAULT_INCLUDE, ...options.include };
  const lines: string[] = [];
  const exportDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  lines.push('# Exported: ' + exportDate);
  if (schoolName) lines.push('# School: ' + schoolName);
  lines.push('');

  if (inc.staff && staff.length > 0) {
    const staffHeaders = ['Name', 'Preferred name', 'Email', 'Role', 'Status', 'Assigned class'];
    lines.push(staffHeaders.map(escapeCsvCell).join(','));
    for (const u of staff) {
      const row = [
        u.displayName ?? '',
        u.preferredName ?? '',
        u.email ?? '',
        u.role ?? '',
        u.role === 'teacher' ? (u.isActive !== false ? 'Active' : 'Inactive') : '',
        (u as StaffRowForPdf).assignedClass ?? '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
    if (inc.parents && parents.length > 0) lines.push('');
  }

  if (inc.parents && parents.length > 0) {
    const parentHeaders = ['Name', 'Email', 'Phone', 'Status', 'Linked children'];
    lines.push(parentHeaders.map(escapeCsvCell).join(','));
    for (const p of parents) {
      const linked = p.children?.length
        ? p.children.map((c) => c.name || c.id).join('; ')
        : '';
      const row = [
        p.displayName ?? '',
        p.email ?? '',
        p.phone ?? '',
        p.isActive !== false ? 'Active' : 'Inactive',
        linked,
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
  }

  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const safeName = (schoolName ?? 'school').replace(/\s+/g, '-').replace(/[()]/g, '');
  const filename =
    inc.parents && !inc.staff
      ? `parents-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`
      : inc.staff && !inc.parents
        ? `staff-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`
        : `staff-and-parents-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
