'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadMealOptionImage } from '@/utils/uploadImage';
import type { MealOption } from 'shared/types';

type MealCategory = 'breakfast' | 'lunch' | 'snack';

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snacks',
};

function OptionCard({
  option,
  onEdit,
  onDelete,
}: {
  option: MealOption;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
      {option.imageUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={option.imageUrl}
            alt={option.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400">
          No image
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 dark:text-slate-100">{option.name}</p>
        {option.description && (
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
            {option.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function FoodMenusPage() {
  const { profile } = useAuth();
  const [options, setOptions] = useState<MealOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<MealCategory>('breakfast');
  const [form, setForm] = useState({ name: '', description: '', imageFile: null as File | null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const q = query(collection(db, 'schools', schoolId, 'mealOptions'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealOption));
      list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setOptions(list);
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const optionsByCategory = (category: MealCategory) =>
    options.filter((o) => o.category === category);

  const resetForm = () => {
    setForm({ name: '', description: '', imageFile: null });
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = (category: MealCategory) => {
    setFormCategory(category);
    setForm({ name: '', description: '', imageFile: null });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (option: MealOption) => {
    setFormCategory(option.category);
    setForm({
      name: option.name,
      description: option.description || '',
      imageFile: null,
    });
    setEditingId(option.id);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (editingId) {
        const data: Record<string, unknown> = {
          name: form.name.trim(),
          description: (form.description || '').trim(),
          updatedAt: now,
        };
        if (form.imageFile) {
          data.imageUrl = await uploadMealOptionImage(form.imageFile, schoolId, editingId);
        }
        await updateDoc(doc(db, 'schools', schoolId, 'mealOptions', editingId), data);
      } else {
        const ref = await addDoc(collection(db, 'schools', schoolId, 'mealOptions'), {
          schoolId,
          category: formCategory,
          name: form.name.trim(),
          description: (form.description || '').trim(),
          order: optionsByCategory(formCategory).length,
          createdAt: now,
          updatedAt: now,
        });
        if (form.imageFile) {
          const imageUrl = await uploadMealOptionImage(form.imageFile, schoolId, ref.id);
          await updateDoc(ref, { imageUrl, updatedAt: new Date().toISOString() });
        }
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOption = async (option: MealOption) => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !confirm(`Delete "${option.name}"?`)) return;
    await deleteDoc(doc(db, 'schools', schoolId, 'mealOptions', option.id));
    if (editingId === option.id) resetForm();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Meal options</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Define options for breakfast, lunch and snacks. Teachers will select from this list when
          logging meals.
        </p>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? 'Edit option' : `New ${CATEGORY_LABELS[formCategory]} option`}
          </h2>
          {!editingId && (
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Category: <strong>{CATEGORY_LABELS[formCategory]}</strong>
            </p>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Scrambled eggs & toast"
                className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of the meal"
                rows={2}
                className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageFile: e.target.files?.[0] ?? null }))
                }
                className="block w-full max-w-md text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 dark:file:bg-primary-900/50 dark:file:text-primary-200"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add option'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {(['breakfast', 'lunch', 'snack'] as const).map((category) => (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {CATEGORY_LABELS[category]}
              </h2>
              <button
                type="button"
                onClick={() => startAdd(category)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Add option
              </button>
            </div>
            <div className="space-y-3">
              {optionsByCategory(category).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No options yet. Add options so teachers can select them when logging meals.
                </p>
              ) : (
                optionsByCategory(category).map((opt) => (
                  <OptionCard
                    key={opt.id}
                    option={opt}
                    onEdit={() => startEdit(opt)}
                    onDelete={() => deleteOption(opt)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
