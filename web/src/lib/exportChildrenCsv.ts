import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export type ClassDisplayFn = (classId: string) => string;

function formatDob(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return '';
  try {
    return new Date(dateOfBirth).toLocaleDateString();
  } catch {
    return dateOfBirth;
  }
}

/** Build CSV for children roster and trigger download. */
export function exportChildrenToCsv(
  children: Child[],
  classes: ClassRoom[],
  classDisplay: ClassDisplayFn
): void {
  const lines: string[] = [];
  lines.push('# Exported: ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
  lines.push('# ' + children.length + ' children');
  lines.push('');
  const headers = ['Name', 'Preferred', 'DOB', 'Class', 'Allergies', 'Emergency'];
  lines.push(headers.map(escapeCsvCell).join(','));
  for (const c of children) {
    const row = [
      c.name ?? '',
      c.preferredName ?? '',
      formatDob(c.dateOfBirth),
      c.classId ? classDisplay(c.classId) : '',
      c.allergies?.length ? (c.allergies as string[]).join('; ') : '',
      c.emergencyContactName || c.emergencyContact || '',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `children-roster-${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
