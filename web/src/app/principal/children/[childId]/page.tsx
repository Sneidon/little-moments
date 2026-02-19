'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import type { DailyReport } from 'shared/types';

const REPORT_TYPE_LABELS: Record<string, string> = {
  nappy_change: 'Nappy change',
  meal: 'Meal',
  nap_time: 'Nap time',
  medication: 'Medication',
  incident: 'Incident',
};

export default function ChildDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const childId = params?.childId as string;
  const [child, setChild] = useState<Child | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !childId) return;
    let cancelled = false;
    (async () => {
      const [childSnap, classesSnap, reportsSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId, 'children', childId)),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
        getDocs(
          query(
            collection(db, 'schools', schoolId, 'children', childId, 'reports'),
            orderBy('timestamp', 'desc')
          )
        ),
      ]);
      if (!cancelled) {
        if (!childSnap.exists()) {
          router.replace('/principal/children');
          return;
        }
        setChild({ id: childSnap.id, ...childSnap.data() } as Child);
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
        setReports(reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport)));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.schoolId, childId, router]);

  const className = (id: string | null | undefined) =>
    id ? classes.find((c) => c.id === id)?.name ?? id : '—';

  const reportsForDay = reports.filter((r) => {
    const ts = r.timestamp ?? '';
    if (!ts) return false;
    const dayStart = filterDay + 'T00:00:00.000Z';
    const dayEnd = filterDay + 'T23:59:59.999Z';
    return ts >= dayStart && ts <= dayEnd;
  }).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const daysWithActivity = Array.from(
    new Set(
      reports
        .map((r) => r.timestamp?.slice(0, 10))
        .filter(Boolean)
    )
  ).sort((a, b) => (b || '').localeCompare(a || '')).slice(0, 14);

  if (loading || !child) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/principal/children"
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to children
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">
          {child.name}
          {child.preferredName && (
            <span className="ml-2 text-lg font-normal text-slate-600">({child.preferredName})</span>
          )}
        </h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth</p>
            <p className="text-slate-800">
              {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Class</p>
            <p className="text-slate-800">{className(child.classId)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Enrollment date</p>
            <p className="text-slate-800">
              {child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Allergies</p>
            <p className="text-slate-800">{child.allergies?.length ? child.allergies.join(', ') : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Medical notes</p>
            <p className="text-slate-800">{child.medicalNotes || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Emergency contact</p>
            <p className="text-slate-800">
              {child.emergencyContactName || child.emergencyContact || '—'}
              {child.emergencyContact && child.emergencyContactName && (
                <span className="text-slate-600"> · {child.emergencyContact}</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Link
            href={`/principal/children?edit=${child.id}`}
            className="text-primary-600 hover:underline"
          >
            Edit child details
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Day-to-day activities</h2>

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
                    filterDay === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          {filterDay === new Date().toISOString().slice(0, 10) ? "Today's" : ''} activities on{' '}
          <strong>{new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </p>

        {reportsForDay.length === 0 ? (
          <p className="rounded-lg bg-slate-50 py-8 text-center text-slate-500">
            No activities recorded for this day.
          </p>
        ) : (
          <ul className="space-y-3">
            {reportsForDay.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
              >
                <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                  {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                </span>
                <span className="text-sm text-slate-600">
                  {r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                {(r.mealType || r.medicationName || r.incidentDetails) && (
                  <span className="text-sm text-slate-700">
                    {r.mealType ?? r.medicationName ?? r.incidentDetails}
                  </span>
                )}
                {r.notes && (
                  <span className="w-full text-sm text-slate-600">{r.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
