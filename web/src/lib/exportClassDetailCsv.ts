import type { ExportClassDetailOptions } from '@/lib/exportClassDetailPdf';
import { REPORT_TYPE_LABELS } from '@/constants/reports';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Export class detail (children roster + activities) to CSV and trigger download. */
export function exportClassDetailToCsv(options: ExportClassDetailOptions): void {
  const { classRoom, assignedTeacherName, children, filterDay, reportsForDay, classDisplayName } = options;
  const inc = { children: true, activities: true, ...options.include };
  const lines: string[] = [];
  const dateLabel = new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  lines.push('# ' + classDisplayName);
  lines.push('# Assigned teacher: ' + assignedTeacherName);
  lines.push('# Exported: ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
  lines.push('');

  if (inc.children && children.length > 0) {
    lines.push('# Children in this class');
    const headers = ['Name', 'Preferred', 'Date of birth', 'Allergies'];
    lines.push(headers.map(escapeCsvCell).join(','));
    for (const c of children) {
      const row = [
        c.name ?? '',
        c.preferredName ?? '',
        c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '',
        (c.allergies as string[])?.length ? (c.allergies as string[]).join('; ') : '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
    lines.push('');
  }

  if (inc.activities) {
    lines.push('# Activities on ' + dateLabel);
    const headers = ['Child', 'Type', 'Time', 'Details', 'Notes'];
    lines.push(headers.map(escapeCsvCell).join(','));
    for (const r of reportsForDay) {
      const row = [
        r.childName ?? '',
        REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '',
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
        r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '',
        r.notes ?? '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
  }

  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const safeName = classDisplayName.replace(/\s+/g, '-').replace(/[()]/g, '');
  const filename = `class-${safeName}-${filterDay}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
