'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

type SchoolStats = {
  id: string;
  name: string;
  children: number;
  reportsCount: number;
  announcements: number;
  events: number;
};

export default function UsagePage() {
  const [stats, setStats] = useState<SchoolStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const schoolsSnap = await getDocs(collection(db, 'schools'));
        const list: SchoolStats[] = [];
        for (const schoolDoc of schoolsSnap.docs) {
          const schoolId = schoolDoc.id;
          const name = (schoolDoc.data() as { name?: string }).name ?? schoolId;
          const [childrenSnap, announcementsSnap, eventsSnap] = await Promise.all([
            getDocs(collection(db, 'schools', schoolId, 'children')),
            getDocs(collection(db, 'schools', schoolId, 'announcements')),
            getDocs(collection(db, 'schools', schoolId, 'events')),
          ]);
          let reportsCount = 0;
          for (const childDoc of childrenSnap.docs) {
            const reportsSnap = await getDocs(
              collection(db, 'schools', schoolId, 'children', childDoc.id, 'reports')
            );
            reportsCount += reportsSnap.size;
          }
          list.push({
            id: schoolId,
            name,
            children: childrenSnap.size,
            reportsCount,
            announcements: announcementsSnap.size,
            events: eventsSnap.size,
          });
        }
        setStats(list);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">Usage & analytics</h1>
      <p className="mb-6 text-slate-600 dark:text-slate-300">
        Overview of activity per school.
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">School</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Children</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Reports</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Announcements</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Events</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.children}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.reportsCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.announcements}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No data yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
