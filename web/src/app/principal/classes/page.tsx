'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';
import type { UserProfile } from 'shared/types';

export default function ClassesPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [minAgeMonths, setMinAgeMonths] = useState<string>('');
  const [maxAgeMonths, setMaxAgeMonths] = useState<string>('');
  const [assignedTeacherId, setAssignedTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      const [classesSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'schools', schoolId, 'classes')),
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      ]);
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
      setTeachers(
        usersSnap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter((u) => u.role === 'teacher' || u.role === 'principal')
      );
      setLoading(false);
    })();
  }, [profile?.schoolId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !name.trim()) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const teacherId = assignedTeacherId?.trim() || null;
      const minMonths = minAgeMonths.trim() ? parseInt(minAgeMonths, 10) : null;
      const maxMonths = maxAgeMonths.trim() ? parseInt(maxAgeMonths, 10) : null;
      const data: Record<string, unknown> = {
        schoolId,
        name: name.trim(),
        minAgeMonths: minMonths ?? null,
        maxAgeMonths: maxMonths ?? null,
        createdAt: now,
        updatedAt: now,
      };
      if (teacherId) {
        data.assignedTeacherId = teacherId;
      } else if (editingId) {
        data.assignedTeacherId = null;
      }
      if (editingId) {
        await updateDoc(doc(db, 'schools', schoolId, 'classes', editingId), data);
        setClasses((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...data } : c)));
        setEditingId(null);
      } else {
        const ref = await addDoc(collection(db, 'schools', schoolId, 'classes'), data);
        setClasses((prev) => [...prev, { id: ref.id, ...data } as ClassRoom]);
      }
      setName('');
      setMinAgeMonths('');
      setMaxAgeMonths('');
      setAssignedTeacherId('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const teacherName = (uid: string) => {
    const t = teachers.find((t) => t.uid === uid);
    return t ? (t.preferredName || t.displayName) : uid;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Classes / rooms</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setName('');
            setMinAgeMonths('');
            setMaxAgeMonths('');
            setAssignedTeacherId('');
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add class
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? 'Edit class' : 'New class'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Class name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rainbow Room"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Min age (months)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={minAgeMonths}
                onChange={(e) => setMinAgeMonths(e.target.value)}
                placeholder="e.g. 24 or 48"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Use months (e.g. 24). 2 yr+ shown as years (24 mo = 2 yr)</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Max age (months)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={maxAgeMonths}
                onChange={(e) => setMaxAgeMonths(e.target.value)}
                placeholder="e.g. 36 or 60"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Assigned teacher</label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">—</option>
                {teachers
                  .filter((t) => t.role === 'principal' || (t.role === 'teacher' && t.isActive !== false))
                  .map((t) => (
                    <option key={t.uid} value={t.uid}>{t.displayName} ({t.role})</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add class'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Assigned teacher</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link href={`/principal/classes/${c.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                      {formatClassDisplay(c)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {c.assignedTeacherId ? teacherName(c.assignedTeacherId) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/principal/classes/${c.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      View activities
                    </Link>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                        setMinAgeMonths(c.minAgeMonths != null ? String(c.minAgeMonths) : '');
                        setMaxAgeMonths(c.maxAgeMonths != null ? String(c.maxAgeMonths) : '');
                        setAssignedTeacherId(c.assignedTeacherId ?? '');
                        setShowForm(true);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classes.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No classes yet. Add a class/room to organize children.</p>
          )}
        </div>
      )}
    </div>
  );
}
