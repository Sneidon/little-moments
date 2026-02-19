'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import type { UserProfile } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export default function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacherEmail: '', teacherDisplayName: '', teacherPreferredName: '', teacherPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', preferredName: '', isActive: true });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const load = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const [usersSnap, classesSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      getDocs(collection(db, 'schools', schoolId, 'classes')),
    ]);
    setStaff(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
    setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
  };

  useEffect(() => {
    if (!profile?.schoolId) return;
    load().then(() => setLoading(false));
  }, [profile?.schoolId]);

  const classForTeacher = (uid: string) =>
    formatClassDisplay(classes.find((c) => c.assignedTeacherId === uid));

  const formatDate = (s: string | undefined) =>
    s ? new Date(s).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—';

  const startEditTeacher = (u: UserProfile) => {
    if (u.role === 'principal') return;
    setEditingUid(u.uid);
    setEditError('');
    setEditForm({
      displayName: u.displayName ?? '',
      preferredName: u.preferredName ?? '',
      isActive: u.isActive !== false,
    });
  };

  const updateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUid) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      const functions = getFunctions(app);
      const updateTeacherFn = httpsCallable<
        { teacherUid: string; displayName?: string; preferredName?: string; isActive?: boolean },
        { ok: boolean }
      >(functions, 'updateTeacher');
      await updateTeacherFn({
        teacherUid: editingUid,
        displayName: editForm.displayName.trim() || undefined,
        preferredName: editForm.preferredName.trim() || undefined,
        isActive: editForm.isActive,
      });
      await load();
      setEditingUid(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to update teacher';
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.teacherEmail?.trim() || !form.teacherPassword || form.teacherPassword.length < 6) {
      setError('Email and password (min 6 characters) are required.');
      return;
    }
    setSubmitting(true);
    try {
      const functions = getFunctions(app);
      const createTeacherFn = httpsCallable<
        { teacherEmail: string; teacherDisplayName?: string; teacherPreferredName?: string; teacherPassword: string },
        { teacherUid: string }
      >(functions, 'createTeacher');
      await createTeacherFn({
        teacherEmail: form.teacherEmail.trim(),
        teacherDisplayName: form.teacherDisplayName.trim() || undefined,
        teacherPreferredName: form.teacherPreferredName.trim() || undefined,
        teacherPassword: form.teacherPassword,
      });
      await load();
      setForm({ teacherEmail: '', teacherDisplayName: '', teacherPreferredName: '', teacherPassword: '' });
      setShowForm(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to add teacher';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Staff & teachers</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setError('');
            setForm({ teacherEmail: '', teacherDisplayName: '', teacherPreferredName: '', teacherPassword: '' });
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add teacher
        </button>
      </div>
      <p className="mb-6 text-slate-600">
        Teachers and principals at your school. Assign teachers to classes from the Classes page.
      </p>

      {showForm && (
        <form
          onSubmit={addTeacher}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">Add teacher</h2>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.teacherEmail}
                onChange={(e) => setForm((f) => ({ ...f, teacherEmail: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="teacher@school.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
              <input
                type="text"
                value={form.teacherDisplayName}
                onChange={(e) => setForm((f) => ({ ...f, teacherDisplayName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Preferred name</label>
              <input
                type="text"
                value={form.teacherPreferredName}
                onChange={(e) => setForm((f) => ({ ...f, teacherPreferredName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. What children call them"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={form.teacherPassword}
                onChange={(e) => setForm((f) => ({ ...f, teacherPassword: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add teacher'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingUid && (
        <form
          onSubmit={updateTeacher}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">Edit teacher</h2>
          {editError && <p className="mb-4 text-sm text-red-600">{editError}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Preferred name</label>
              <input
                type="text"
                value={editForm.preferredName}
                onChange={(e) => setEditForm((f) => ({ ...f, preferredName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="editIsActive" className="text-sm font-medium text-slate-700">Active (inactive teachers cannot be assigned to new classes)</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={editSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {editSubmitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setEditingUid(null); setEditError(''); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Preferred name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Assigned class</th>
                <th className="px-4 py-3 font-medium text-slate-700">Added</th>
                <th className="px-4 py-3 font-medium text-slate-700">Updated</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{u.preferredName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'principal'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'teacher' ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{classForTeacher(u.uid) ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.updatedAt)}</td>
                  <td className="px-4 py-3">
                    {u.role === 'teacher' && (
                      <button
                        type="button"
                        onClick={() => startEditTeacher(u)}
                        className="text-primary-600 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No staff in this school yet. Use Add teacher to add teachers.</p>
          )}
        </div>
      )}
    </div>
  );
}
