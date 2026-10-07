import { ageFromDob } from '@/lib/formatClass';
import type { ExportChildDetailsOptions } from './childDetailsPdf';
import { activeLabel, csvRow, downloadCsv, downloadWorkbook, exportDateLabel, todayStamp, type Cell, type Sheet } from './common';

const PARENT_HEADERS = ['Name', 'Email', 'Phone', 'Status'];

function profileRows({ child, classDisplay }: ExportChildDetailsOptions): [string, string][] {
  const rows: [string, string][] = [
    ['Age', ageFromDob(child.dateOfBirth)],
    ['Date of birth', child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : ''],
    ['Class', classDisplay(child.classId)],
    ['Enrollment date', child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : ''],
  ];
  if (child.allergies?.length) rows.push(['Allergies', (child.allergies as string[]).join(', ')]);
  if (child.medicalNotes) rows.push(['Medical notes', child.medicalNotes]);
  if (child.emergencyContactName || child.emergencyContact) {
    rows.push(['Emergency contact', [child.emergencyContactName, child.emergencyContact].filter(Boolean).join(' · ')]);
  }
  return rows;
}

function parentRows({ parents }: ExportChildDetailsOptions): Cell[][] {
  return parents.map((p) => [p.displayName ?? '', p.email ?? '', p.phone ?? '', activeLabel(p.isActive)]);
}

function activityRows({ reports }: ExportChildDetailsOptions): Cell[][] {
  const rows: Cell[][] = [['Total activities', reports.length]];
  if (reports[0]?.timestamp) {
    rows.push(['Last activity', new Date(reports[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })]);
  }
  return rows;
}

function sections(options: ExportChildDetailsOptions) {
  const inc = { profile: true, parents: true, activitySummary: true, ...options.include };
  return { profile: inc.profile, parents: inc.parents && options.parents.length > 0, activity: inc.activitySummary };
}

function fileBase(options: ExportChildDetailsOptions) {
  return `child-details-${(options.child.name ?? 'child').replace(/\s+/g, '-').toLowerCase()}-${todayStamp()}`;
}

export function exportChildDetailsToCsv(options: ExportChildDetailsOptions): void {
  const show = sections(options);
  const lines = ['# Child details: ' + (options.child.name ?? ''), '# Exported: ' + exportDateLabel(), ''];
  if (show.profile) lines.push('# Profile', 'Field,Value', ...profileRows(options).map(csvRow), '');
  if (show.parents) lines.push('# Parents', csvRow(PARENT_HEADERS), ...parentRows(options).map(csvRow), '');
  if (show.activity) lines.push('# Activity summary', ...activityRows(options).map(csvRow));
  downloadCsv(lines, `${fileBase(options)}.csv`);
}

export function exportChildDetailsToExcel(options: ExportChildDetailsOptions): void {
  const show = sections(options);
  const stamp = [['Exported:', exportDateLabel()], []];
  const sheets: Sheet[] = [];
  if (show.profile) sheets.push({ name: 'Profile', rows: [...stamp, ['Field', 'Value'], ...profileRows(options)] });
  if (show.parents) sheets.push({ name: 'Parents', rows: [...stamp, PARENT_HEADERS, ...parentRows(options)] });
  if (show.activity) sheets.push({ name: 'Activity summary', rows: [...stamp, ...activityRows(options)] });
  downloadWorkbook(sheets, `${fileBase(options)}.xlsx`);
}
