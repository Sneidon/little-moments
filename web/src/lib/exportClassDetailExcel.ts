import * as XLSX from 'xlsx';
import type { ExportClassDetailOptions } from '@/lib/exportClassDetailPdf';
import { REPORT_TYPE_LABELS } from '@/constants/reports';

/** Export class detail (children roster + activities) to Excel (.xlsx) and trigger download. */
export function exportClassDetailToExcel(options: ExportClassDetailOptions): void {
  const { classRoom, assignedTeacherName, children, filterDay, reportsForDay, classDisplayName } = options;
  const inc = { children: true, activities: true, ...options.include };
  const wb = XLSX.utils.book_new();
  const exportDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dateLabel = new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (inc.children && children.length > 0) {
    const childrenHeaders = ['Name', 'Preferred', 'Date of birth', 'Allergies'];
    const childrenRows = children.map((c) => [
      c.name ?? '',
      c.preferredName ?? '',
      c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '',
      (c.allergies as string[])?.length ? (c.allergies as string[]).join(', ') : '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      ['Exported:', exportDate],
      ['Class:', classDisplayName],
      ['Assigned teacher:', assignedTeacherName],
      [],
      childrenHeaders,
      ...childrenRows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Children');
  }

  if (inc.activities) {
    const activityHeaders = ['Child', 'Type', 'Time', 'Details', 'Notes'];
    const activityRows = reportsForDay.map((r) => [
      r.childName ?? '',
      REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '',
      r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
      r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '',
      r.notes ?? '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      ['Exported:', exportDate],
      ['Activities on ' + dateLabel],
      [],
      activityHeaders,
      ...activityRows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Activities');
  }

  const safeName = classDisplayName.replace(/\s+/g, '-').replace(/[()]/g, '');
  XLSX.writeFile(wb, `class-${safeName}-${filterDay}.xlsx`);
}
