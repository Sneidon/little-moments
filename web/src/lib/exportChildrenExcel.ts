import * as XLSX from 'xlsx';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export type ClassDisplayFn = (classId: string) => string;

function formatDob(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return '';
  try {
    return new Date(dateOfBirth).toLocaleDateString();
  } catch {
    return dateOfBirth;
  }
}

/** Export children roster to Excel (.xlsx) and trigger download. */
export function exportChildrenToExcel(
  children: Child[],
  classes: ClassRoom[],
  classDisplay: ClassDisplayFn
): void {
  const headers = ['Name', 'Preferred', 'DOB', 'Class', 'Allergies', 'Emergency'];
  const rows = children.map((c) => [
    c.name ?? '',
    c.preferredName ?? '',
    formatDob(c.dateOfBirth),
    c.classId ? classDisplay(c.classId) : '',
    c.allergies?.length ? (c.allergies as string[]).join(', ') : '',
    c.emergencyContactName || c.emergencyContact || '',
  ]);
  const exportDate = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const data = [['Exported:', exportDate], [children.length + ' children'], [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Children');
  XLSX.writeFile(wb, `children-roster-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
