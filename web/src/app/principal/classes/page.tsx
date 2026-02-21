'use client';

import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useClasses } from '@/hooks/useClasses';
import { useSchoolTeachers } from '@/hooks/useSchoolTeachers';
import { getTeacherDisplayName } from '@/lib/teachers';
import {
  createClass,
  updateClass,
  toClassFormData,
  type ClassFormData,
} from '@/services/classes';
import type { ClassRoom } from 'shared/types';
import { ClassForm, ClassesTable } from './components';

const INITIAL_FORM: ClassFormData = {
  name: '',
  minAgeMonths: null,
  maxAgeMonths: null,
  assignedTeacherId: null,
};

export default function ClassesPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const { classes, loading, setClasses } = useClasses(profile?.schoolId);
  const { teachers } = useSchoolTeachers(profile?.schoolId);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const editIdFromUrl = searchParams?.get('edit');
  useEffect(() => {
    if (!editIdFromUrl || loading || classes.length === 0) return;
    const c = classes.find((x) => x.id === editIdFromUrl);
    if (c) {
      setEditingId(c.id);
      setForm(toClassFormData(c));
      setShowForm(true);
    }
  }, [editIdFromUrl, loading, classes]);

  const teacherName = useCallback(
    (uid: string) => getTeacherDisplayName(uid, teachers),
    [teachers]
  );

  const openAdd = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }, []);

  const openEdit = useCallback((c: ClassRoom) => {
    setEditingId(c.id);
    setForm(toClassFormData(c));
    setShowForm(true);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }, []);

  const save = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const schoolId = profile?.schoolId;
      if (!schoolId || !form.name.trim()) return;
      setSubmitting(true);
      try {
        if (editingId) {
          await updateClass(schoolId, editingId, form);
          setClasses((prev) =>
            prev.map((c) =>
              c.id === editingId
                ? {
                    ...c,
                    name: form.name,
                    minAgeMonths: form.minAgeMonths ?? undefined,
                    maxAgeMonths: form.maxAgeMonths ?? undefined,
                    assignedTeacherId: form.assignedTeacherId ?? undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            )
          );
          setEditingId(null);
        } else {
          const { id, data } = await createClass(schoolId, form);
          setClasses((prev) => [...prev, { id, ...data } as ClassRoom]);
        }
        setForm(INITIAL_FORM);
        setShowForm(false);
      } finally {
        setSubmitting(false);
      }
    },
    [profile?.schoolId, editingId, form, setClasses]
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Classes / rooms
        </h1>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add class
        </button>
      </div>

      {showForm && (
        <ClassForm
          editingId={editingId}
          form={form}
          setForm={setForm}
          teachers={teachers}
          submitting={submitting}
          onSubmit={save}
          onCancel={cancelForm}
        />
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <ClassesTable
          classes={classes}
          teacherDisplayName={teacherName}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}
