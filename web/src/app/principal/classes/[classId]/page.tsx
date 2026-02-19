'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';
import type { Child } from 'shared/types';
import type { DailyReport } from 'shared/types';
import type { UserProfile } from 'shared/types';

type ReportRow = DailyReport & { childId: string; childName: string };

const REPORT_TYPE_LABELS: Record<string, string> = {
  nappy_change: 'Nappy change',
  meal: 'Meal',
  nap_time: 'Nap time',
  medication: 'Medication',
  incident: 'Incident',
};

export default function ClassActivitiesPage() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !classId) return;
    let cancelled = false;
    (async () => {
      const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', classId));
      if (!cancelled && !classSnap.exists()) {
        router.replace('/principal/classes');
        return;
      }
      if (!cancelled && classSnap.exists()) {
        setClassRoom({ id: classSnap.id, ...classSnap.data() } as ClassRoom);
      }

      const [childrenSnap, teachersSnap] = await Promise.all([
        getDocs(query(collection(db, 'schools', schoolId, 'children'), where('classId', '==', classId))),
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      ]);
      const childList = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
      const teacherList = teachersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter((u) => u.role === 'teacher' || u.role === 'principal');
      if (!cancelled) {
        setChildren(childList);
        setTeachers(teacherList);
      }

      const list: ReportRow[] = [];
      for (const child of childList) {
        const name = child.name ?? child.id;
        const reportsSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', child.id, 'reports'),
            orderBy('timestamp', 'desc')
          )
        );
        reportsSnap.docs.forEach((r) => {
          list.push({
            id: r.id,
            ...r.data(),
            childId: child.id,
            childName: name,
          } as ReportRow);
        });
      }
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      if (!cancelled) setReports(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.schoolId, classId, router]);

  const teacherName = (uid: string) => {
    const t = teachers.find((x) => x.uid === uid);
    return t ? (t.preferredName || t.displayName) : uid;
  };

  const reportsForDay = reports.filter((r) => {
    const ts = r.timestamp ?? '';
    if (!ts) return false;
    const dayStart = filterDay + 'T00:00:00.000Z';
    const dayEnd = filterDay + 'T23:59:59.999Z';
    return ts >= dayStart && ts <= dayEnd;
  }).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const daysWithActivity = Array.from(
    new Set(reports.map((r) => r.timestamp?.slice(0, 10)).filter(Boolean))
  ).sort((a, b) => (b || '').localeCompare(a || '')).slice(0, 14);

  if (loading || !classRoom) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/principal/classes" className="text-slate-600 hover:text-slate-900">
          ← Back to classes
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">{formatClassDisplay(classRoom)}</h1>
        <p className="text-slate-600">
          Assigned teacher: {classRoom.assignedTeacherId ? teacherName(classRoom.assignedTeacherId) : '—'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {children.length} child{children.length !== 1 ? 'ren' : ''} in this class
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Class activities by day</h2>

        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">View day</label>
            <input
              type="date"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Jump to a day with activity</p>
            <div className="flex flex-wrap gap-2">
              {daysWithActivity.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDay(d!)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    filterDay === d ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {new Date(d!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </button>
              ))}
              {daysWithActivity.length === 0 && (
                <span className="text-sm text-slate-500">No activity recorded yet</span>
              )}
            </div>
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-600">
          Activities on{' '}
          <strong>
            {new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </strong>
        </p>

        {reportsForDay.length === 0 ? (
          <p className="rounded-lg bg-slate-50 py-8 text-center text-slate-500">
            No activities recorded for this class on this day.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Child</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Time</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Details</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportsForDay.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link
                        href={`/principal/children/${r.childId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {r.childName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.timestamp
                        ? new Date(r.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.mealType ?? r.medicationName ?? r.incidentDetails ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Children in this class</h2>
        {children.length === 0 ? (
          <p className="text-slate-500">No children assigned to this class yet.</p>
        ) : (
          <ul className="space-y-2">
            {children.map((child) => (
              <li key={child.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                <div>
                  <Link
                    href={`/principal/children/${child.id}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {child.name}
                  </Link>
                  {child.preferredName && (
                    <span className="ml-2 text-slate-600">({child.preferredName})</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'}
                  {child.allergies?.length ? ` · ${child.allergies.length} allerg${child.allergies.length !== 1 ? 'ies' : 'y'}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
