import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ReportType } from '@shared/types';

function toReportIsoTimestamp(ts: unknown): string {
  if (typeof ts === 'string') return ts;
  if (ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

export function isChildPresentFromDayReports(reports: Array<{ type?: string; ts: string }>): boolean {
  let isPresent = false;
  for (const report of reports) {
    if (report.type === 'check_in') isPresent = true;
    if (report.type === 'check_out') isPresent = false;
  }
  return isPresent;
}

type DayReportEntry = { type?: string; ts: string };

export async function loadDayReports(schoolId: string, childId: string, dateStr: string): Promise<DayReportEntry[]> {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;
  const snap = await getDocs(collection(db, 'schools', schoolId, 'children', childId, 'reports'));
  return snap.docs
    .map((d) => {
      const data = d.data() as { timestamp?: unknown; createdAt?: unknown; type?: string };
      return { type: data.type, ts: toReportIsoTimestamp(data.timestamp) || toReportIsoTimestamp(data.createdAt) };
    })
    .filter((r) => r.ts && r.ts >= dayStart && r.ts <= dayEnd)
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function loadPresentChildIdsForDate(
  schoolId: string,
  childIds: string[],
  dateStr: string
): Promise<Set<string>> {
  const results = await Promise.all(
    childIds.map(async (childId) => ({
      childId,
      present: isChildPresentFromDayReports(await loadDayReports(schoolId, childId, dateStr)),
    }))
  );
  return new Set(results.filter((r) => r.present).map((r) => r.childId));
}

export function isChildEligibleForUpdateType(
  childId: string,
  presentChildIds: Set<string>,
  type: ReportType
): boolean {
  const isPresent = presentChildIds.has(childId);
  if (type === 'check_in') return !isPresent;
  if (type === 'check_out') return isPresent;
  return isPresent;
}

export function ineligibleSelectionMessage(type: ReportType): string {
  if (type === 'check_in') {
    return 'This child is already checked in. Only children who are not checked in can be selected.';
  }
  if (type === 'check_out') {
    return 'This child is not checked in. Only checked-in children can be checked out.';
  }
  return 'This child is not checked in. Only checked-in children can receive this update.';
}

export function selectAllChildrenLabel(type: ReportType): string {
  if (type === 'check_in') return 'All not checked in';
  return 'All checked in';
}
