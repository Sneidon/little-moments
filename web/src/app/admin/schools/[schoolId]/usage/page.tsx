'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHero, SectionCard } from '@/components/ui';

export default function AdminSchoolUsagePage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const [schoolName, setSchoolName] = useState<string>('');
  const [stats, setStats] = useState({
    children: 0,
    parents: 0,
    teachers: 0,
    reportsCount: 0,
    announcements: 0,
    events: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
        if (!schoolSnap.exists()) {
          setError('School not found');
          setLoading(false);
          return;
        }
        const name = (schoolSnap.data() as { name?: string }).name ?? schoolId;
        setSchoolName(name);

        const [childrenSnap, announcementsSnap, eventsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'schools', schoolId, 'children')),
          getDocs(collection(db, 'schools', schoolId, 'announcements')),
          getDocs(collection(db, 'schools', schoolId, 'events')),
          getDocs(collection(db, 'users')),
        ]);
        let reportsCount = 0;
        const parentIds = new Set<string>();
        for (const childDoc of childrenSnap.docs) {
          const d = childDoc.data() as { parentIds?: string[] };
          (d.parentIds ?? []).forEach((uid: string) => parentIds.add(uid));
          const reportsSnap = await getDocs(
            collection(db, 'schools', schoolId, 'children', childDoc.id, 'reports')
          );
          reportsCount += reportsSnap.size;
        }
        const schoolUsers = usersSnap.docs.filter((d) => (d.data() as { schoolId?: string }).schoolId === schoolId);
        const teacherCount = schoolUsers.filter((d) => (d.data() as { role?: string }).role === 'teacher').length;
        setStats({
          children: childrenSnap.size,
          parents: parentIds.size,
          teachers: teacherCount,
          reportsCount,
          announcements: announcementsSnap.size,
          events: eventsSnap.size,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  if (loading && !schoolName && !error) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/usage"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to Usage & analytics
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        backHref="/admin/usage"
        backLabel="Usage & analytics"
        title={<span className="text-gradient-warm">Usage & analytics</span>}
        subtitle={`${schoolName || 'School'} — activity overview`}
        actions={
          <Link href={`/admin/schools/${schoolId}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
            Back to {schoolName || 'school'}
          </Link>
        }
      />

      <SectionCard topBar="accent" padding="none">
        <table className="data-table">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Metric</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Children</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.children}</td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Parents</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.parents}</td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Teachers</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.teachers}</td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Reports</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.reportsCount}</td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Announcements</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.announcements}</td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">Events</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats.events}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
