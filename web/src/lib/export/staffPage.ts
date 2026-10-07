import { activeLabel, csvRow, downloadCsv, downloadWorkbook, exportDateLabel, fileSafeName, todayStamp, type Cell, type Sheet } from './common';
import type { ExportStaffPageOptions, ParentWithChildren, StaffRowForPdf } from './staffPagePdf';

const STAFF_HEADERS = ['Name', 'Preferred name', 'Email', 'Role', 'Status', 'Assigned class'];
const PARENT_HEADERS = ['Name', 'Email', 'Phone', 'Status', 'Linked children'];

function staffRows(staff: StaffRowForPdf[]): Cell[][] {
  return staff.map((u) => [
    u.displayName ?? '',
    u.preferredName ?? '',
    u.email ?? '',
    u.role ?? '',
    u.role === 'teacher' ? activeLabel(u.isActive) : '',
    u.assignedClass ?? '',
  ]);
}

function parentRows(parents: ParentWithChildren[], listSeparator: string): Cell[][] {
  return parents.map((p) => [
    p.displayName ?? '',
    p.email ?? '',
    p.phone ?? '',
    activeLabel(p.isActive),
    p.children?.length ? p.children.map((c) => c.name || c.id).join(listSeparator) : '',
  ]);
}

function setup(options: ExportStaffPageOptions, extension: string) {
  const { schoolName, staff = [], parents = [] } = options;
  const inc = { staff: true, parents: true, ...options.include };
  const prefix = inc.parents && !inc.staff ? 'parents' : inc.staff && !inc.parents ? 'staff' : 'staff-and-parents';
  return {
    staff,
    parents,
    showStaff: inc.staff && staff.length > 0,
    showParents: inc.parents && parents.length > 0,
    filename: `${prefix}-${fileSafeName(schoolName ?? 'school')}-${todayStamp()}.${extension}`,
  };
}

export function exportStaffPageToCsv(options: ExportStaffPageOptions): void {
  const { staff, parents, showStaff, showParents, filename } = setup(options, 'csv');
  const lines = ['# Exported: ' + exportDateLabel(), ...(options.schoolName ? ['# School: ' + options.schoolName] : []), ''];
  if (showStaff) lines.push(csvRow(STAFF_HEADERS), ...staffRows(staff).map(csvRow), ...(showParents ? [''] : []));
  if (showParents) lines.push(csvRow(PARENT_HEADERS), ...parentRows(parents, '; ').map(csvRow));
  downloadCsv(lines, filename);
}

export function exportStaffPageToExcel(options: ExportStaffPageOptions): void {
  const { staff, parents, showStaff, showParents, filename } = setup(options, 'xlsx');
  const preamble: Cell[][] = [['Exported:', exportDateLabel()], ...(options.schoolName ? [['School:', options.schoolName], []] : [])];
  const sheets: Sheet[] = [];
  if (showStaff) sheets.push({ name: 'Staff', rows: [...preamble, STAFF_HEADERS, ...staffRows(staff)] });
  if (showParents) sheets.push({ name: 'Parents', rows: [...preamble, PARENT_HEADERS, ...parentRows(parents, ', ')] });
  downloadWorkbook(sheets, filename);
}
