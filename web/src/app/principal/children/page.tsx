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
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export default function ChildrenPage() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    allergies: '',
    emergencyContact: '',
    classId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      const [childrenSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, 'schools', schoolId, 'children')),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);
      setChildren(
        childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child))
      );
      setClasses(
        classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom))
      );
      setLoading(false);
    })();
  }, [profile?.schoolId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !form.name.trim() || !form.dateOfBirth) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const data = {
        schoolId,
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        allergies: form.allergies
          ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        emergencyContact: form.emergencyContact.trim() || null,
        classId: form.classId || null,
        parentIds: [],
        createdAt: now,
        updatedAt: now,
      };
      if (editingId) {
        await updateDoc(
          doc(db, 'schools', schoolId, 'children', editingId),
          data
        );
        setChildren((prev) =>
          prev.map((c) =>
            c.id === editingId ? { ...c, ...data } : c
          )
        );
        setEditingId(null);
      } else {
        const ref = await addDoc(
          collection(db, 'schools', schoolId, 'children'),
          data
        );
        setChildren((prev) => [...prev, { id: ref.id, ...data } as Child]);
      }
      setForm({ name: '', dateOfBirth: '', allergies: '', emergencyContact: '', classId: '' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Child) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      dateOfBirth: c.dateOfBirth?.slice(0, 10) ?? '',
      allergies: c.allergies?.join(', ') ?? '',
      emergencyContact: c.emergencyContact ?? '',
      classId: c.classId ?? '',
    });
    setShowForm(true);
  };

  const className = (id: string) => classes.find((r) => r.id === id)?.name ?? id;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Children</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ name: '', dateOfBirth: '', allergies: '', emergencyContact: '', classId: '' });
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add child
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit child' : 'New child'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Allergies (comma-separated)</label>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                placeholder="e.g. Peanuts, Tree nuts"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Emergency contact</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Class / room</label>
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">—</option>
                {classes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
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
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add child'}
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
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">DOB</th>
                <th className="px-4 py-3 font-medium text-slate-700">Class</th>
                <th className="px-4 py-3 font-medium text-slate-700">Allergies</th>
                <th className="px-4 py-3 font-medium text-slate-700">Emergency</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.classId ? className(c.classId) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.allergies?.length ? c.allergies.join(', ') : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.emergencyContact ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {children.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No children yet. Add a child to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}
