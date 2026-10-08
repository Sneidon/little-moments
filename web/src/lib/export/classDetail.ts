import { getReportDetailsSummary, getReportTypeLabel } from '@/lib/reports';
import type { ExportClassDetailOptions } from './classDetailPdf';
import { csvRow, downloadCsv, downloadWorkbook, exportDateLabel, fileSafeName, type Sheet } from './common';

const CHILD_HEADERS = ['Name', 'Preferred', 'Date of birth', 'Allergies'];
const ACTIVITY_HEADERS = ['Child', 'Type', 'Time', 'Details', 'Notes'];

function childRows({ children }: ExportClassDetailOptions, listSeparator: string) {
  return children.map((c) => [
    c.name ?? '',
    c.preferredName ?? '',
    c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '',
    (c.allergies as string[])?.length ? (c.allergies as string[]).join(listSeparator) : '',
  ]);
}

function activityRows({ reportsForDay }: ExportClassDetailOptions) {
  return reportsForDay.map((r) => [
    r.childName ?? '',
    getReportTypeLabel(r),
    r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
    getReportDetailsSummary(r),
    r.notes ?? '',
  ]);
}

function dayLabel(filterDay: string) {
  return new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function setup(options: ExportClassDetailOptions) {
  const inc = { children: true, activities: true, ...options.include };
  return {
    showChildren: inc.children && options.children.length > 0,
    showActivities: inc.activities,
    fileBase: `class-${fileSafeName(options.classDisplayName)}-${options.filterDay}`,
  };
}

export function exportClassDetailToCsv(options: ExportClassDetailOptions): void {
  const { showChildren, showActivities, fileBase } = setup(options);
  const lines = ['# ' + options.classDisplayName, '# Assigned teacher: ' + options.assignedTeacherName, '# Exported: ' + exportDateLabel(), ''];
  if (showChildren) lines.push('# Children in this class', csvRow(CHILD_HEADERS), ...childRows(options, '; ').map(csvRow), '');
  if (showActivities) {
    lines.push('# Activities on ' + dayLabel(options.filterDay), csvRow(ACTIVITY_HEADERS), ...activityRows(options).map(csvRow));
  }
  downloadCsv(lines, `${fileBase}.csv`);
}

export function exportClassDetailToExcel(options: ExportClassDetailOptions): void {
  const { showChildren, showActivities, fileBase } = setup(options);
  const exported = ['Exported:', exportDateLabel()];
  const sheets: Sheet[] = [];
  if (showChildren) {
    sheets.push({
      name: 'Children',
      rows: [exported, ['Class:', options.classDisplayName], ['Assigned teacher:', options.assignedTeacherName], [], CHILD_HEADERS, ...childRows(options, ', ')],
    });
  }
  if (showActivities) {
    sheets.push({
      name: 'Activities',
      rows: [exported, ['Activities on ' + dayLabel(options.filterDay)], [], ACTIVITY_HEADERS, ...activityRows(options)],
    });
  }
  downloadWorkbook(sheets, `${fileBase}.xlsx`);
}
