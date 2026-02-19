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
    preferredName: '',
    dateOfBirth: '',
    allergies: [] as string[],
    allergyInput: '',
    medicalNotes: '',
    enrollmentDate: '',
    emergencyContact: '',
    emergencyContactName: '',
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
      // Firestore rejects undefined; only include defined values or null
      const base: Record<string, unknown> = {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        allergies: form.allergies.filter(Boolean),
        emergencyContact: form.emergencyContact.trim() || null,
        classId: form.classId || null,
        updatedAt: now,
      };
      const preferredName = form.preferredName.trim();
      const medicalNotes = form.medicalNotes.trim();
      const enrollmentDate = form.enrollmentDate || null;
      const emergencyContactName = form.emergencyContactName.trim();
      if (preferredName) base.preferredName = preferredName;
      else base.preferredName = null;
      if (medicalNotes) base.medicalNotes = medicalNotes;
      else base.medicalNotes = null;
      if (enrollmentDate) base.enrollmentDate = enrollmentDate;
      else base.enrollmentDate = null;
      if (emergencyContactName) base.emergencyContactName = emergencyContactName;
      else base.emergencyContactName = null;
      if (editingId) {
        const existing = children.find((c) => c.id === editingId);
        const updateData = { ...base, parentIds: existing?.parentIds ?? [], createdAt: existing?.createdAt ?? now };
        await updateDoc(
          doc(db, 'schools', schoolId, 'children', editingId),
          updateData
        );
        setChildren((prev) =>
          prev.map((c) =>
            c.id === editingId ? { ...c, ...base } : c
          )
        );
        setEditingId(null);
      } else {
        const data = { schoolId, ...base, parentIds: [], createdAt: now };
        const ref = await addDoc(
          collection(db, 'schools', schoolId, 'children'),
          data
        );
        setChildren((prev) => [...prev, { id: ref.id, ...data } as Child]);
      }
      setForm({
        name: '',
        preferredName: '',
        dateOfBirth: '',
        allergies: [],
        allergyInput: '',
        medicalNotes: '',
        enrollmentDate: '',
        emergencyContact: '',
        emergencyContactName: '',
        classId: '',
      });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Child) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      preferredName: c.preferredName ?? '',
      dateOfBirth: c.dateOfBirth?.slice(0, 10) ?? '',
      allergies: c.allergies ?? [],
      allergyInput: '',
      medicalNotes: c.medicalNotes ?? '',
      enrollmentDate: c.enrollmentDate?.slice(0, 10) ?? '',
      emergencyContact: c.emergencyContact ?? '',
      emergencyContactName: c.emergencyContactName ?? '',
      classId: c.classId ?? '',
    });
    setShowForm(true);
  };

  const addAllergy = () => {
    const v = form.allergyInput.trim();
    if (v && !form.allergies.includes(v)) {
      setForm((f) => ({ ...f, allergies: [...f.allergies, v], allergyInput: '' }));
    }
  };
  const removeAllergy = (idx: number) => {
    setForm((f) => ({ ...f, allergies: f.allergies.filter((_, i) => i !== idx) }));
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
            setForm({
              name: '',
              preferredName: '',
              dateOfBirth: '',
              allergies: [],
              allergyInput: '',
              medicalNotes: '',
              enrollmentDate: '',
              emergencyContact: '',
              emergencyContactName: '',
              classId: '',
            });
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Preferred name</label>
              <input
                type="text"
                value={form.preferredName}
                onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Enrollment date</label>
              <input
                type="date"
                value={form.enrollmentDate}
                onChange={(e) => setForm((f) => ({ ...f, enrollmentDate: e.target.value }))}
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Allergies</label>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={form.allergyInput}
                  onChange={(e) => setForm((f) => ({ ...f, allergyInput: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  placeholder="Add allergy (e.g. Peanuts)"
                  className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Add
                </button>
              </div>
              {form.allergies.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {form.allergies.map((a, idx) => (
                    <li key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-800">
                      {a}
                      <button type="button" onClick={() => removeAllergy(idx)} className="text-primary-600 hover:text-primary-800" aria-label="Remove">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Medical notes</label>
              <textarea
                value={form.medicalNotes}
                onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))}
                rows={2}
                placeholder="Optional medical or care notes"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Emergency contact name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                placeholder="e.g. Parent name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Emergency contact phone</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
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
                <th className="px-4 py-3 font-medium text-slate-700">Preferred</th>
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
                  <td className="px-4 py-3 text-slate-600">{c.preferredName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.classId ? className(c.classId) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.allergies?.length ? c.allergies.join(', ') : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.emergencyContactName || c.emergencyContact ? (
                      <span title={c.emergencyContact ?? ''}>{c.emergencyContactName ?? c.emergencyContact ?? '—'}</span>
                    ) : '—'}
                  </td>
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
