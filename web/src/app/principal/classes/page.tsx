'use client';

import { useAuth } from '@/context/AuthContext';
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
      const data = {
        schoolId,
        name: name.trim(),
        assignedTeacherId: assignedTeacherId || undefined,
        createdAt: now,
        updatedAt: now,
      };
      if (editingId) {
        await updateDoc(doc(db, 'schools', schoolId, 'classes', editingId), data);
        setClasses((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...data } : c)));
        setEditingId(null);
      } else {
        const ref = await addDoc(collection(db, 'schools', schoolId, 'classes'), data);
        setClasses((prev) => [...prev, { id: ref.id, ...data } as ClassRoom]);
      }
      setName('');
      setAssignedTeacherId('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const teacherName = (uid: string) => teachers.find((t) => t.uid === uid)?.displayName ?? uid;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Classes / rooms</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setName('');
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
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit class' : 'New class'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Class name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rainbow Room"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assigned teacher</label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">—</option>
                {teachers.map((t) => (
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
                <th className="px-4 py-3 font-medium text-slate-700">Class name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Assigned teacher</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.assignedTeacherId ? teacherName(c.assignedTeacherId) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                        setAssignedTeacherId(c.assignedTeacherId ?? '');
                        setShowForm(true);
                      }}
                      className="text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classes.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No classes yet. Add a class/room to organize children.</p>
          )}
        </div>
      )}
    </div>
  );
}
