'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { formatClassDisplay } from '@/lib/formatClass';
import { exportChildrenToPdf } from '@/lib/exportChildrenPdf';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export default function ChildrenPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string>('');

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

  const editIdFromUrl = searchParams?.get('edit');
  useEffect(() => {
    if (!editIdFromUrl || loading || children.length === 0) return;
    const c = children.find((ch) => ch.id === editIdFromUrl);
    if (c) {
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
    }
  }, [editIdFromUrl, loading, children]);

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
        setChildren((prev) => [...prev, { id: ref.id, ...data } as unknown as Child]);
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

  const classDisplay = (id: string) => formatClassDisplay(classes.find((r) => r.id === id)) || id;

  const filteredChildren = filterClassId
    ? children.filter((c) => c.classId === filterClassId)
    : children;

  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      exportChildrenToPdf(filteredChildren, classes, classDisplay, {
        onProgress: (msg) => {
          if (!msg) setExportingPdf(false);
        },
      });
    } catch (e) {
      console.error(e);
      setExportingPdf(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Children</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enrolled children at your school</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading || filteredChildren.length === 0}
            className="btn-secondary"
            title={filteredChildren.length === 0 ? 'No children to export' : 'Export roster to PDF (supports hundreds of records)'}
          >
            {exportingPdf ? 'Exporting…' : 'Export to PDF'}
          </button>
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
            className="btn-primary"
          >
            Add child
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="card mb-8 p-6"
        >
          <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? 'Edit child' : 'New child'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred name</label>
              <input
                type="text"
                value={form.preferredName}
                onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
                placeholder="Optional"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Enrollment date</label>
              <input
                type="date"
                value={form.enrollmentDate}
                onChange={(e) => setForm((f) => ({ ...f, enrollmentDate: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Class / room</label>
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="input-base"
              >
                <option value="">—</option>
                {classes.map((r) => (
                  <option key={r.id} value={r.id}>{formatClassDisplay(r)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Allergies</label>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={form.allergyInput}
                  onChange={(e) => setForm((f) => ({ ...f, allergyInput: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  placeholder="Add allergy (e.g. Peanuts)"
                  className="input-base min-w-[140px] flex-1"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              {form.allergies.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {form.allergies.map((a, idx) => (
                    <li key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/50 px-3 py-1 text-sm text-primary-800 dark:text-primary-200">
                      {a}
                      <button type="button" onClick={() => removeAllergy(idx)} className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200" aria-label="Remove">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Medical notes</label>
              <textarea
                value={form.medicalNotes}
                onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))}
                rows={2}
                placeholder="Optional medical or care notes"
                className="input-base resize-y"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Emergency contact name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                placeholder="e.g. Parent name"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Emergency contact phone</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Phone number"
                className="input-base"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add child'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by class</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{formatClassDisplay(c)}</option>
              ))}
            </select>
            {filterClassId && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filteredChildren.length} of {children.length} children
              </span>
            )}
          </div>
          <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preferred</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">DOB</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Class</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Allergies</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Emergency</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      <Link href={`/principal/children/${c.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.preferredName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.classId ? classDisplay(c.classId) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.allergies?.length ? c.allergies.join(', ') : '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.emergencyContactName || c.emergencyContact ? (
                        <span title={c.emergencyContact ?? ''}>{c.emergencyContactName ?? c.emergencyContact ?? '—'}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredChildren.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-slate-500">
                {filterClassId ? 'No children in this class.' : 'No children yet.'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {filterClassId ? 'Try another class or clear the filter.' : 'Add a child to get started.'}
              </p>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
