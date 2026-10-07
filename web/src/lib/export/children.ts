import type { Child } from 'shared/types';
import { formatGenderLabel } from '@/lib/formatGender';
import { csvRow, downloadCsv, downloadWorkbook, exportDateLabel, localDate, todayStamp } from './common';

export type ClassDisplayFn = (classId: string) => string;

const HEADERS = ['Name', 'Preferred', 'DOB', 'Gender', 'Class', 'Allergies', 'Emergency'];

function childRows(children: Child[], classDisplay: ClassDisplayFn, listSeparator: string) {
  return children.map((c) => [
    c.name ?? '',
    c.preferredName ?? '',
    localDate(c.dateOfBirth),
    formatGenderLabel(c.gender),
    c.classId ? classDisplay(c.classId) : '',
    c.allergies?.length ? (c.allergies as string[]).join(listSeparator) : '',
    c.emergencyContactName || c.emergencyContact || '',
  ]);
}

export function exportChildrenToCsv(children: Child[], classDisplay: ClassDisplayFn): void {
  const lines = ['# Exported: ' + exportDateLabel(), '# ' + children.length + ' children', '', csvRow(HEADERS)];
  lines.push(...childRows(children, classDisplay, '; ').map(csvRow));
  downloadCsv(lines, `children-roster-${todayStamp()}.csv`);
}

export function exportChildrenToExcel(children: Child[], classDisplay: ClassDisplayFn): void {
  const rows = [['Exported:', exportDateLabel()], [children.length + ' children'], [], HEADERS, ...childRows(children, classDisplay, ', ')];
  downloadWorkbook([{ name: 'Children', rows }], `children-roster-${todayStamp()}.xlsx`);
}
