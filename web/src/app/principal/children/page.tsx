'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportChildrenToPdf } from '@/lib/exportChildrenPdf';
import { useSchoolName } from '@/hooks/useSchoolName';
import { exportChildrenToCsv } from '@/lib/exportChildrenCsv';
import { exportChildrenToExcel } from '@/lib/exportChildrenExcel';
import type { Child } from 'shared/types';
import type { ClassRoom } from 'shared/types';
import { PageHero, SectionCard, TableSkeleton, FilterSkeleton } from '@/components/ui';
import { DateOfBirthField, isValidIsoDateString } from '@/components/DateOfBirthField';

export default function ChildrenPage() {
  const { profile } = useAuth();
  const schoolName = useSchoolName(profile?.schoolId);
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
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      const [childrenSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, 'schools', schoolId, 'children')),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);

      const missingIsActive = childrenSnap.docs.filter(
        (d) => !Object.prototype.hasOwnProperty.call(d.data(), 'isActive')
      );
      if (missingIsActive.length > 0) {
        const now = new Date().toISOString();
        for (let i = 0; i < missingIsActive.length; i += 450) {
          const slice = missingIsActive.slice(i, i + 450);
          const batch = writeBatch(db);
          for (const d of slice) {
            batch.update(d.ref, { isActive: true, updatedAt: now });
          }
          await batch.commit();
        }
        const patchedSnap = await getDocs(collection(db, 'schools', schoolId, 'children'));
        setChildren(patchedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      } else {
        setChildren(childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      }

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
        isActive: c.isActive !== false,
      });
      setShowForm(true);
    }
  }, [editIdFromUrl, loading, children]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !form.name.trim() || !isValidIsoDateString(form.dateOfBirth)) return;
    if (!form.emergencyContactName.trim() || !form.emergencyContact.trim()) return;
    const enrollmentTrimmed = form.enrollmentDate.trim();
    if (enrollmentTrimmed && !isValidIsoDateString(enrollmentTrimmed)) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      // Firestore rejects undefined; only include defined values or null
      const enrolled = Boolean(form.isActive);
      const base: Record<string, unknown> = {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        allergies: form.allergies.filter(Boolean),
        emergencyContact: form.emergencyContact.trim(),
        classId: enrolled ? form.classId || null : null,
        updatedAt: now,
        isActive: enrolled,
      };
      const preferredName = form.preferredName.trim();
      const medicalNotes = form.medicalNotes.trim();
      const enrollmentDate = enrollmentTrimmed && isValidIsoDateString(enrollmentTrimmed) ? enrollmentTrimmed : null;
      if (preferredName) base.preferredName = preferredName;
      else base.preferredName = null;
      if (medicalNotes) base.medicalNotes = medicalNotes;
      else base.medicalNotes = null;
      if (enrollmentDate) base.enrollmentDate = enrollmentDate;
      else base.enrollmentDate = null;
      base.emergencyContactName = form.emergencyContactName.trim();
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
        isActive: true,
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
      isActive: c.isActive !== false,
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

  const filteredChildren = children
    .filter((c) => {
      if (enrollmentFilter === 'active') return c.isActive !== false;
      if (enrollmentFilter === 'inactive') return c.isActive === false;
      return true;
    })
    .filter((c) => (filterClassId ? c.classId === filterClassId : true))
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const name = (c.name ?? '').toLowerCase();
      const preferred = (c.preferredName ?? '').toLowerCase();
      return name.includes(q) || preferred.includes(q);
    });

  const handleExportPdf = () => {
    setExportOpen(false);
    setExportingPdf(true);
    try {
      exportChildrenToPdf(filteredChildren, classes, classDisplay, {
        onProgress: (msg) => {
          if (!msg) setExportingPdf(false);
        },
        schoolName: schoolName ?? undefined,
      });
    } catch (e) {
      console.error(e);
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCsv = () => {
    setExportOpen(false);
    exportChildrenToCsv(filteredChildren, classes, classDisplay);
  };

  const handleExportExcel = () => {
    setExportOpen(false);
    exportChildrenToExcel(filteredChildren, classes, classDisplay);
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Children</span>}
        subtitle="Manage active enrollments — mark children as left school when they no longer attend"
        actions={
          <>
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                disabled={exportingPdf || loading || filteredChildren.length === 0}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                aria-expanded={exportOpen}
                aria-haspopup="true"
                title={filteredChildren.length === 0 ? 'No children to export' : 'Export roster'}
              >
                <span>{exportingPdf ? 'Exporting…' : 'Export'}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1.5 shadow-xl"
                  role="menu"
                >
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Download as
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCsv}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
                    Spreadsheet (CSV)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportExcel}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
                    Excel
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportPdf}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
                    PDF document
                  </button>
                </div>
              )}
            </div>
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
                  isActive: true,
                });
              }}
              className="btn-primary"
            >
              Add child
            </button>
          </>
        }
      />

      {showForm && (
        <SectionCard topBar="primary" className="mb-8">
          <form onSubmit={save}>
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Date of birth
              </span>
              <DateOfBirthField
                id="child-dob"
                value={form.dateOfBirth}
                onChange={(iso) => setForm((f) => ({ ...f, dateOfBirth: iso }))}
                required
                inputClassName="input-base w-full"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Enrollment date
              </span>
              <DateOfBirthField
                id="child-enrollment"
                purpose="enrollment"
                value={form.enrollmentDate}
                onChange={(iso) => setForm((f) => ({ ...f, enrollmentDate: iso }))}
                required={false}
                inputClassName="input-base w-full"
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
            <div className="sm:col-span-2 flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/40 px-4 py-3">
              <input
                type="checkbox"
                id="child-is-active"
                checked={form.isActive}
                onChange={(e) => {
                  const next = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    isActive: next,
                    classId: next ? f.classId : '',
                  }));
                }}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <label htmlFor="child-is-active" className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Enrolled at this school (active roster)
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Untick when the child has left — they are removed from their class roster, disappear from teacher and
                  parent class lists, and parents stop seeing this profile.
                </p>
              </div>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Emergency contact name <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                placeholder="e.g. Parent or guardian name"
                className="input-base"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Emergency contact phone <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={form.emergencyContact}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Phone number"
                className="input-base"
                required
                autoComplete="tel"
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
        </SectionCard>
      )}

      {loading ? (
        <>
          <SectionCard topBar="accent" padding="default" className="mb-6">
            <FilterSkeleton />
          </SectionCard>
          <SectionCard topBar="accent" padding="none">
            <TableSkeleton />
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard topBar="accent" padding="default" className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
              {(filterClassId || searchQuery.trim() || enrollmentFilter !== 'active') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterClassId('');
                    setSearchQuery('');
                    setEnrollmentFilter('active');
                  }}
                  className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Enrollment</label>
              <select
                value={enrollmentFilter}
                onChange={(e) => setEnrollmentFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input-base max-w-[200px]"
              >
                <option value="active">Enrolled only</option>
                <option value="inactive">Left school only</option>
                <option value="all">All children</option>
              </select>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Class</label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="input-base max-w-[220px]"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{formatClassDisplay(c)}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="children-search">Search by name</label>
              <input
                id="children-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name…"
                className="input-base max-w-[200px]"
                aria-label="Search children by name"
              />
              {(filterClassId || searchQuery.trim() || enrollmentFilter !== 'active') && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredChildren.length} of {children.length} children
                </span>
              )}
            </div>
          </SectionCard>
          <SectionCard topBar="accent" padding="none">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="bg-slate-50/80 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preferred</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">DOB</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Class</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Allergies</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Emergency</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50 ${
                      c.isActive === false ? 'opacity-70' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      <Link href={`/principal/children/${c.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive === false ? (
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                          Left school
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                          Enrolled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.preferredName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.classId ? classDisplay(c.classId) : '—'}</td>
                    <td className="px-4 py-3">
                      {c.allergies?.length ? (
                        <ul className="flex flex-wrap gap-1.5" role="list">
                          {c.allergies.map((a, idx) => (
                            <li key={idx}>
                              <span className="inline-flex rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                {a.trim()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">—</span>
                      )}
                    </td>
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
            <div className="px-6 py-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                {filterClassId || searchQuery.trim()
                  ? 'No children match the current filters.'
                  : 'No children yet.'}
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {filterClassId || searchQuery.trim()
                  ? 'Try another class, change the search, or clear filters.'
                  : 'Add a child to get started.'}
              </p>
            </div>
          )}
        </SectionCard>
        </>
      )}
    </div>
  );
}
