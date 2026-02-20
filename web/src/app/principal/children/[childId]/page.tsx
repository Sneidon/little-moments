'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import type { DailyReport } from 'shared/types';
import type { UserProfile } from 'shared/types';

const MAX_PARENTS = 4;

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
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [showInviteParent, setShowInviteParent] = useState(false);
  const [inviteForm, setInviteForm] = useState({ parentEmail: '', parentDisplayName: '', parentPhone: '', parentPassword: '' });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [editingParentUid, setEditingParentUid] = useState<string | null>(null);
  const [editParentForm, setEditParentForm] = useState({ displayName: '', phone: '', isActive: true });
  const [editParentSubmitting, setEditParentSubmitting] = useState(false);
  const [editParentError, setEditParentError] = useState('');

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

  useEffect(() => {
    const ids = child?.parentIds ?? [];
    if (ids.length === 0) {
      setParents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const snaps = await Promise.all(ids.map((uid) => getDoc(doc(db, 'users', uid))));
      if (cancelled) return;
      setParents(
        snaps
          .filter((s) => s.exists())
          .map((s) => ({ uid: s.id, ...s.data() } as UserProfile))
      );
    })();
    return () => { cancelled = true; };
  }, [child?.parentIds]);

  const refetchParents = async () => {
    const ids = child?.parentIds ?? [];
    if (ids.length === 0) { setParents([]); return; }
    const snaps = await Promise.all(ids.map((uid: string) => getDoc(doc(db, 'users', uid))));
    setParents(
      snaps
        .filter((s) => s.exists())
        .map((s) => ({ uid: s.id, ...s.data() } as UserProfile))
    );
  };

  const startEditParent = (p: UserProfile) => {
    setEditingParentUid(p.uid);
    setEditParentError('');
    setEditParentForm({
      displayName: p.displayName ?? '',
      phone: p.phone ?? '',
      isActive: p.isActive !== false,
    });
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParentUid) return;
    setEditParentError('');
    setEditParentSubmitting(true);
    try {
      const functions = getFunctions(app);
      const updateParentFn = httpsCallable<
        { parentUid: string; displayName?: string; phone?: string; isActive?: boolean },
        { ok: boolean }
      >(functions, 'updateParent');
      await updateParentFn({
        parentUid: editingParentUid,
        displayName: editParentForm.displayName.trim() || undefined,
        phone: editParentForm.phone.trim() || undefined,
        isActive: editParentForm.isActive,
      });
      await refetchParents();
      setEditingParentUid(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to update parent';
      setEditParentError(message);
    } finally {
      setEditParentSubmitting(false);
    }
  };

  const handleInviteParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!child || !inviteForm.parentEmail?.trim() || !inviteForm.parentPassword || inviteForm.parentPassword.length < 6) {
      setInviteError('Email and password (min 6 characters) are required.');
      return;
    }
    if ((child.parentIds?.length ?? 0) >= MAX_PARENTS) {
      setInviteError(`Maximum ${MAX_PARENTS} parents allowed.`);
      return;
    }
    setInviteSubmitting(true);
    try {
      const functions = getFunctions(app);
      const invite = httpsCallable<
        { childId: string; parentEmail: string; parentDisplayName?: string; parentPhone?: string; parentPassword: string },
        { parentUid: string }
      >(functions, 'inviteParentToChild');
      await invite({
        childId: child.id,
        parentEmail: inviteForm.parentEmail.trim(),
        parentDisplayName: inviteForm.parentDisplayName.trim() || undefined,
        parentPhone: inviteForm.parentPhone.trim() || undefined,
        parentPassword: inviteForm.parentPassword,
      });
      const childSnap = await getDoc(doc(db, 'schools', profile!.schoolId!, 'children', child.id));
      if (childSnap.exists()) setChild({ id: childSnap.id, ...childSnap.data() } as Child);
      setInviteForm({ parentEmail: '', parentDisplayName: '', parentPhone: '', parentPassword: '' });
      setShowInviteParent(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to invite parent';
      setInviteError(message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const classDisplay = (id: string | null | undefined) =>
    id ? formatClassDisplay(classes.find((c) => c.id === id)) || id : '—';

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
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Back to children
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {child.name}
          {child.preferredName && (
            <span className="ml-2 text-lg font-normal text-slate-600 dark:text-slate-300">({child.preferredName})</span>
          )}
        </h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of birth</p>
            <p className="text-slate-800 dark:text-slate-200">
              {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Class</p>
            <p className="text-slate-800 dark:text-slate-200">{classDisplay(child.classId)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Enrollment date</p>
            <p className="text-slate-800 dark:text-slate-200">
              {child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Allergies</p>
            <p className="text-slate-800 dark:text-slate-200">{child.allergies?.length ? child.allergies.join(', ') : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Medical notes</p>
            <p className="text-slate-800 dark:text-slate-200">{child.medicalNotes || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency contact</p>
            <p className="text-slate-800 dark:text-slate-200">
              {child.emergencyContactName || child.emergencyContact || '—'}
              {child.emergencyContact && child.emergencyContactName && (
                <span className="text-slate-600 dark:text-slate-400"> · {child.emergencyContact}</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 dark:border-slate-600 pt-4">
          <Link
            href={`/principal/children?edit=${child.id}`}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Edit child details
          </Link>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Maximum {MAX_PARENTS} parents per child. Invited parents can sign in and view this child&apos;s reports.
        </p>
        {parents.length > 0 && (
          <ul className="mb-4 space-y-2">
            {parents.map((p) => (
              <li
                key={p.uid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
                  <span className="text-slate-600 dark:text-slate-300">{p.email}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {p.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">No phone</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEditParent(p)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editingParentUid && (
          <form onSubmit={handleUpdateParent} className="mb-4 max-w-md space-y-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 p-4">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">Edit parent</h3>
            {editParentError && <p className="text-sm text-red-600 dark:text-red-400">{editParentError}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
              <input
                type="text"
                value={editParentForm.displayName}
                onChange={(e) => setEditParentForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="tel"
                value={editParentForm.phone}
                onChange={(e) => setEditParentForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editParentIsActive"
                checked={editParentForm.isActive}
                onChange={(e) => setEditParentForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="editParentIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editParentSubmitting}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {editParentSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingParentUid(null); setEditParentError(''); }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {(child.parentIds?.length ?? 0) < MAX_PARENTS && (
          <>
            {!showInviteParent ? (
              <button
                type="button"
                onClick={() => setShowInviteParent(true)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Invite parent
              </button>
            ) : (
              <form onSubmit={handleInviteParent} className="max-w-md space-y-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 p-4">
                <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent</h3>
                {inviteError && <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={inviteForm.parentEmail}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentEmail: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
                  <input
                    type="text"
                    value={inviteForm.parentDisplayName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentDisplayName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="tel"
                    value={inviteForm.parentPhone}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentPhone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <input
                    type="password"
                    value={inviteForm.parentPassword}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentPassword: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {inviteSubmitting ? 'Inviting…' : 'Invite parent'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInviteParent(false); setInviteError(''); setInviteForm({ parentEmail: '', parentDisplayName: '', parentPhone: '', parentPassword: '' }); }}
                    className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        {(child.parentIds?.length ?? 0) >= MAX_PARENTS && parents.length >= MAX_PARENTS && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Maximum number of parents reached.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Day-to-day activities</h2>

        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">View day</label>
            <input
              type="date"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Jump to a day with activity</p>
            <div className="flex flex-wrap gap-2">
              {daysWithActivity.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDay(d!)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    filterDay === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {new Date(d!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </button>
              ))}
              {daysWithActivity.length === 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet</span>
              )}
            </div>
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {filterDay === new Date().toISOString().slice(0, 10) ? "Today's" : ''} activities on{' '}
          <strong>{new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </p>

        {reportsForDay.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-700/50 py-8 text-center text-slate-500 dark:text-slate-400">
            No activities recorded for this day.
          </p>
        ) : (
          <ul className="space-y-3">
            {reportsForDay.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 p-3"
              >
                <span className="inline-flex rounded-full bg-primary-100 dark:bg-primary-900/50 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-200">
                  {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                {(r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails) && (
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails}
                  </span>
                )}
                {r.notes && (
                  <span className="w-full text-sm text-slate-600 dark:text-slate-300">{r.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
