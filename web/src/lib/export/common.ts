import * as XLSX from 'xlsx';

export type Cell = string | number;
export type Sheet = { name: string; rows: Cell[][] };

export function escapeCsvCell(value: Cell | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function csvRow(cells: (Cell | undefined | null)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function downloadCsv(lines: string[], filename: string): void {
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadWorkbook(sheets: Sheet[], filename: string): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  XLSX.writeFile(wb, filename);
}

export function exportDateLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fileSafeName(name: string): string {
  return name.replace(/\s+/g, '-').replace(/[()]/g, '');
}

export function localDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function activeLabel(isActive: boolean | undefined): string {
  return isActive !== false ? 'Active' : 'Inactive';
}
