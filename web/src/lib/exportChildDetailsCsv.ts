import type { ExportChildDetailsOptions } from '@/lib/exportChildDetailsPdf';
import { ageFromDob } from '@/lib/formatClass';

function escapeCsvCell(value: string | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Export single child details to CSV and trigger download. */
export function exportChildDetailsToCsv(options: ExportChildDetailsOptions): void {
  const { child, classes, parents, reports, classDisplay } = options;
  const inc = { profile: true, parents: true, activitySummary: true, ...options.include };
  const lines: string[] = [];
  lines.push('# Child details: ' + (child.name ?? ''));
  lines.push('# Exported: ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
  lines.push('');

  if (inc.profile) {
    lines.push('# Profile');
    const profileRows: [string, string][] = [
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
    lines.push('Field,Value');
    for (const [k, v] of profileRows) {
      lines.push([k, v].map(escapeCsvCell).join(','));
    }
    lines.push('');
  }

  if (inc.parents && parents.length > 0) {
    lines.push('# Parents');
    lines.push(['Name', 'Email', 'Phone', 'Status'].map(escapeCsvCell).join(','));
    for (const p of parents) {
      const row = [
        p.displayName ?? '',
        p.email ?? '',
        p.phone ?? '',
        p.isActive !== false ? 'Active' : 'Inactive',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
    lines.push('');
  }

  if (inc.activitySummary) {
    lines.push('# Activity summary');
    lines.push('Total activities,' + reports.length);
    if (reports[0]?.timestamp) {
      lines.push('Last activity,' + new Date(reports[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    }
  }

  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `child-details-${(child.name ?? 'child').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
