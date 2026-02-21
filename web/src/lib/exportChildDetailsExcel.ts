import * as XLSX from 'xlsx';
import type { ExportChildDetailsOptions } from '@/lib/exportChildDetailsPdf';
import { ageFromDob } from '@/lib/formatClass';

/** Export single child details to Excel (.xlsx) and trigger download. */
export function exportChildDetailsToExcel(options: ExportChildDetailsOptions): void {
  const { child, classes, parents, reports, classDisplay } = options;
  const inc = { profile: true, parents: true, activitySummary: true, ...options.include };
  const wb = XLSX.utils.book_new();
  const exportDate = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (inc.profile) {
    const profileRows: (string | number)[][] = [
      ['Field', 'Value'],
      ['Age', ageFromDob(child.dateOfBirth)],
      ['Date of birth', child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : ''],
      ['Class', classDisplay(child.classId)],
      ['Enrollment date', child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : ''],
    ];
    if (child.allergies?.length) {
      profileRows.push(['Allergies', (child.allergies as string[]).join(', ')]);
    }
    if (child.medicalNotes) {
      profileRows.push(['Medical notes', child.medicalNotes]);
    }
    if (child.emergencyContactName || child.emergencyContact) {
      profileRows.push(['Emergency contact', [child.emergencyContactName, child.emergencyContact].filter(Boolean).join(' · ')]);
    }
    const ws = XLSX.utils.aoa_to_sheet([['Exported:', exportDate], [], ...profileRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Profile');
  }

  if (inc.parents && parents.length > 0) {
    const parentHeaders = ['Name', 'Email', 'Phone', 'Status'];
    const parentRows = parents.map((p) => [
      p.displayName ?? '',
      p.email ?? '',
      p.phone ?? '',
      p.isActive !== false ? 'Active' : 'Inactive',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([['Exported:', exportDate], [], parentHeaders, ...parentRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Parents');
  }

  if (inc.activitySummary) {
    const activityData: (string | number)[][] = [
      ['Exported:', exportDate],
      [],
      ['Total activities', reports.length],
    ];
    if (reports[0]?.timestamp) {
      activityData.push(['Last activity', new Date(reports[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })]);
    }
    const ws = XLSX.utils.aoa_to_sheet(activityData);
    XLSX.utils.book_append_sheet(wb, ws, 'Activity summary');
  }

  const filename = `child-details-${(child.name ?? 'child').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
