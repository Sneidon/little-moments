'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { DailyReport } from 'shared/types';

type ReportRow = DailyReport & { childId: string; childName: string };

export default function ReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      const childrenSnap = await getDocs(collection(db, 'schools', schoolId, 'children'));
      const childNames: Record<string, string> = {};
      const list: ReportRow[] = [];
      for (const childDoc of childrenSnap.docs) {
        const name = (childDoc.data() as { name?: string }).name ?? childDoc.id;
        childNames[childDoc.id] = name;
        const reportsSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', childDoc.id, 'reports'),
            orderBy('timestamp', 'desc')
          )
        );
        reportsSnap.docs.forEach((r) => {
          list.push({
            id: r.id,
            ...r.data(),
            childId: childDoc.id,
            childName: name,
          } as ReportRow);
        });
      }
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      if (!cancelled) setReports(list.slice(0, 200));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.schoolId]);

  const filtered = reports.filter((r) => {
    if (filterType && r.type !== filterType) return false;
    const ts = r.timestamp ?? '';
    if (filterDateFrom && ts < filterDateFrom) return false;
    if (filterDateTo && ts > filterDateTo + 'T23:59:59.999Z') return false;
    return true;
  });

  const reportTypes: { value: string; label: string }[] = [
    { value: '', label: 'All types' },
    { value: 'nappy_change', label: 'Nappy change' },
    { value: 'meal', label: 'Meal' },
    { value: 'nap_time', label: 'Nap time' },
    { value: 'medication', label: 'Medication' },
    { value: 'incident', label: 'Incident' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Reports</h1>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {reportTypes.map((t) => (
              <option key={t.value || 'all'} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Child</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Time</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.childName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No reports match the filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
