'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { formatClassDisplay, formatAgeMonths } from '@/lib/formatClass';
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

const REPORT_TYPE_STYLES: Record<string, string> = {
  nappy_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  meal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  nap_time: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  medication: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  incident: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

function ageFromDob(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return '—';
  try {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    return formatAgeMonths(months);
  } catch {
    return '—';
  }
}

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

  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const lastReportTimestamp = reports[0]?.timestamp;
  const activitySummaryByType = reportsForDay.reduce<Record<string, number>>((acc, r) => {
    const t = r.type ?? 'other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const activitySummaryText = Object.entries(activitySummaryByType)
    .map(([type, count]) => `${count} ${REPORT_TYPE_LABELS[type] ?? type}`)
    .join(', ');

  if (loading || !child) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const hasAllergies = child.allergies?.length;
  const hasCareInfo = child.medicalNotes || child.emergencyContact || child.emergencyContactName;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-4 border-b border-slate-200 dark:border-slate-600 pb-4">
        <Link
          href="/principal/children"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
          aria-label="Back to children list"
        >
          ← Back to children
        </Link>
      </div>

      <div className="card mb-8 p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {child.name}
            {child.preferredName && (
              <span className="ml-2 text-lg font-normal text-slate-600 dark:text-slate-300">“{child.preferredName}”</span>
            )}
          </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {reports.length} {reports.length === 1 ? 'activity' : 'activities'} total
              {lastReportTimestamp && (
                <> · Last activity {new Date(lastReportTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</>
              )}
            </p>
          </div>
          <Link
            href={`/principal/children?edit=${child.id}`}
            className="btn-secondary w-fit shrink-0"
          >
            Edit details
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Age</p>
            <p className="text-slate-800 dark:text-slate-200">{ageFromDob(child.dateOfBirth)}</p>
          </div>
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
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Enrollment</p>
            <p className="text-slate-800 dark:text-slate-200">
              {child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {hasAllergies && (
          <div className="mt-6 rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs" aria-hidden>!</span>
              Allergies
            </p>
            <ul className="flex flex-wrap gap-2" role="list">
              {child.allergies!.map((allergy, idx) => (
                <li key={idx}>
                  <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/60 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100">
                    {allergy.trim()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasCareInfo && (
          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Care information</h3>
            <div className="space-y-3">
              {child.medicalNotes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Medical notes</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{child.medicalNotes}</p>
                </div>
              )}
              {(child.emergencyContactName || child.emergencyContact) && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency contact</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    {child.emergencyContactName || '—'}
                    {child.emergencyContact && (
                      <a href={`tel:${child.emergencyContact}`} className="ml-2 text-primary-600 dark:text-primary-400 hover:underline">
                        {child.emergencyContact}
                      </a>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <section className="card mb-8 p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Up to {MAX_PARENTS} parents per child. Invited parents can sign in and view this child&apos;s reports.
        </p>
        {parents.length === 0 && !showInviteParent && (child.parentIds?.length ?? 0) < MAX_PARENTS && (
          <div className="mb-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-8 px-4 text-center">
            <p className="text-slate-600 dark:text-slate-300">No parents linked yet.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Invite a parent so they can sign in and view this child&apos;s daily activities.</p>
            <button type="button" onClick={() => setShowInviteParent(true)} className="btn-primary mt-4">
              Invite parent
            </button>
          </div>
        )}
        {parents.length > 0 && (
          <ul className="mb-6 space-y-3">
            {parents.map((p) => (
              <li
                key={p.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-sm">{p.email}</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {p.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">{p.phone}</a>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">No phone</span>
                  )}
                  <button
                    type="button"
                    onClick={() => startEditParent(p)}
                    className="btn-secondary text-sm py-1.5 px-3"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editingParentUid && (
          <form onSubmit={handleUpdateParent} className="mb-6 max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">Edit parent</h3>
            {editParentError && <p className="text-sm text-red-600 dark:text-red-400">{editParentError}</p>}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
              <input
                type="text"
                value={editParentForm.displayName}
                onChange={(e) => setEditParentForm((f) => ({ ...f, displayName: e.target.value }))}
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="tel"
                value={editParentForm.phone}
                onChange={(e) => setEditParentForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-base"
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
              <button type="submit" disabled={editParentSubmitting} className="btn-primary">
                {editParentSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingParentUid(null); setEditParentError(''); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {(child.parentIds?.length ?? 0) < MAX_PARENTS && (parents.length > 0 || showInviteParent) && (
          <>
            {!showInviteParent ? (
              <button type="button" onClick={() => setShowInviteParent(true)} className="btn-primary">
                Invite parent
              </button>
            ) : (
              <form onSubmit={handleInviteParent} className="max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4">
                <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent</h3>
                {inviteError && <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={inviteForm.parentEmail}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentEmail: e.target.value }))}
                    className="input-base"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
                  <input
                    type="text"
                    value={inviteForm.parentDisplayName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentDisplayName: e.target.value }))}
                    className="input-base"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="tel"
                    value={inviteForm.parentPhone}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentPhone: e.target.value }))}
                    className="input-base"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <input
                    type="password"
                    value={inviteForm.parentPassword}
                    onChange={(e) => setInviteForm((f) => ({ ...f, parentPassword: e.target.value }))}
                    className="input-base"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={inviteSubmitting} className="btn-primary">
                    {inviteSubmitting ? 'Inviting…' : 'Invite parent'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInviteParent(false); setInviteError(''); setInviteForm({ parentEmail: '', parentDisplayName: '', parentPhone: '', parentPassword: '' }); }}
                    className="btn-secondary"
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

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Day-to-day activities</h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          View and filter by date. Jump to recent days that have recorded activity.
        </p>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Filter by date</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="input-base h-10 w-[10.5rem] min-w-0"
              aria-label="Select date"
            />
            <button
              type="button"
              onClick={() => setFilterDay(todayIso)}
              className={`h-10 min-w-[5.5rem] flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                filterDay === todayIso
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFilterDay(yesterdayIso)}
              className={`h-10 min-w-[5.5rem] flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                filterDay === yesterdayIso
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700'
              }`}
            >
              Yesterday
            </button>
            {daysWithActivity.map((d) => {
              const label = d === todayIso ? 'Today' : d === yesterdayIso ? 'Yesterday' : new Date(d!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              const isSelected = filterDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDay(d!)}
                  className={`h-10 min-w-[5.5rem] flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {daysWithActivity.length === 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet</span>
            )}
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {filterDay === todayIso ? "Today's" : filterDay === yesterdayIso ? "Yesterday's" : ''} activities on{' '}
            <strong className="text-slate-800 dark:text-slate-100">
              {new Date(filterDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </strong>
            {reportsForDay.length > 0 && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">· {reportsForDay.length} {reportsForDay.length === 1 ? 'activity' : 'activities'} ({activitySummaryText})</span>
            )}
          </p>
        </div>

        {reportsForDay.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No activities recorded for this day.</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Activities are added by teachers from the app.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reportsForDay.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 p-4"
              >
                <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${REPORT_TYPE_STYLES[r.type ?? ''] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                  {REPORT_TYPE_LABELS[r.type ?? ''] ?? r.type ?? '—'}
                </span>
                <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                  {r.timestamp ? new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  {(r.mealOptionName ?? r.mealType ?? r.medicationName ?? r.incidentDetails) && (
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      {r.type === 'meal' && r.mealType && (
                        <span className="capitalize text-slate-500 dark:text-slate-400">{r.mealType}</span>
                      )}
                      {r.type === 'meal' && r.mealType && (r.mealOptionName ?? r.notes) && ' · '}
                      {r.mealOptionName ?? r.medicationName ?? r.incidentDetails ?? (r.type === 'meal' ? r.mealType : r.mealType)}
                    </p>
                  )}
                  {r.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.notes}</p>
                  )}
                  {r.imageUrl && (
                    <a
                      href={r.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      <img
                        src={r.imageUrl}
                        alt="Report attachment"
                        className="h-20 w-auto object-cover"
                      />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
