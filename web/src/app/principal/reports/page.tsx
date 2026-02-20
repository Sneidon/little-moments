'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import type { DailyReport } from 'shared/types';
import type { ClassRoom } from 'shared/types';

type ReportRow = DailyReport & { childId: string; childName: string; childClassId?: string | null };

export default function ReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterDay, setFilterDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      const [childrenSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, 'schools', schoolId, 'children')),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);
      const childNames: Record<string, string> = {};
      const childClassIds: Record<string, string | null> = {};
      const list: ReportRow[] = [];
      for (const childDoc of childrenSnap.docs) {
        const data = childDoc.data() as { name?: string; classId?: string | null };
        const name = data.name ?? childDoc.id;
        childNames[childDoc.id] = name;
        childClassIds[childDoc.id] = data.classId ?? null;
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
            childClassId: data.classId ?? null,
          } as ReportRow);
        });
      }
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      if (!cancelled) {
        setReports(list.slice(0, 500));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.schoolId]);

  const filtered = reports.filter((r) => {
    if (filterClassId && r.childClassId !== filterClassId) return false;
    if (filterType && r.type !== filterType) return false;
    const ts = r.timestamp ?? '';
    if (filterDay) {
      const dayStart = filterDay + 'T00:00:00.000Z';
      const dayEnd = filterDay + 'T23:59:59.999Z';
      if (ts < dayStart || ts > dayEnd) return false;
    } else {
      if (filterDateFrom && ts < filterDateFrom) return false;
      if (filterDateTo && ts > filterDateTo + 'T23:59:59.999Z') return false;
    }
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

  const classDisplay = (id: string) => formatClassDisplay(classes.find((c) => c.id === id)) || id;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Class</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Day</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              title="View activities for this day"
            />
            {filterDay && (
              <button
                type="button"
                onClick={() => setFilterDay('')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Activities for this day</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Or date range</label>
          <span className="text-xs text-slate-400 dark:text-slate-500">From</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setFilterDay(''); }}
            className="ml-1 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span className="mx-1 text-xs text-slate-400 dark:text-slate-500">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setFilterDay(''); }}
            className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Clear Day to use range</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {reportTypes.map((t) => (
              <option key={t.value || 'all'} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Child</th>
                  {!filterClassId && <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Class</th>}
                  <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Time</th>
                  <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Details</th>
                  <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.childName}</td>
                    {!filterClassId && (
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.childClassId ? classDisplay(r.childClassId) : '—'}</td>
                    )}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.notes ?? '—'}</td>
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
