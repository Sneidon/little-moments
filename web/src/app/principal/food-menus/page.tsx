'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { FoodMenu } from 'shared/types';

type MealKey = 'breakfast' | 'lunch' | 'snack';

function MealItems({
  label,
  items,
  onAdd,
  onRemove,
  inputValue,
  onInputChange,
}: {
  label: string;
  items: string[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={`Add ${label.toLowerCase()} item`}
          className="flex-1 min-w-[140px] rounded-lg border border-slate-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 list-none">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-800"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-primary-600 hover:text-primary-800"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FoodMenusPage() {
  const { profile } = useAuth();
  const [menus, setMenus] = useState<FoodMenu[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    weekStart: '',
    breakfast: [] as string[],
    lunch: [] as string[],
    snack: [] as string[],
  });
  const [mealInputs, setMealInputs] = useState({ breakfast: '', lunch: '', snack: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'foodMenus'),
      orderBy('weekStart', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMenus(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodMenu)));
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const addMealItem = (meal: MealKey) => {
    const v = mealInputs[meal].trim();
    if (!v) return;
    setForm((f) => ({ ...f, [meal]: [...f[meal], v] }));
    setMealInputs((m) => ({ ...m, [meal]: '' }));
  };

  const removeMealItem = (meal: MealKey, idx: number) => {
    setForm((f) => ({ ...f, [meal]: f[meal].filter((_, i) => i !== idx) }));
  };

  const resetForm = () => {
    setForm({ weekStart: '', breakfast: [], lunch: [], snack: [] });
    setMealInputs({ breakfast: '', lunch: '', snack: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (m: FoodMenu) => {
    setEditingId(m.id);
    setForm({
      weekStart: m.weekStart?.slice(0, 10) ?? '',
      breakfast: m.breakfast ?? [],
      lunch: m.lunch ?? [],
      snack: m.snack ?? [],
    });
    setMealInputs({ breakfast: '', lunch: '', snack: '' });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !form.weekStart) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const data = {
        schoolId,
        weekStart: form.weekStart,
        breakfast: form.breakfast.filter(Boolean),
        lunch: form.lunch.filter(Boolean),
        snack: form.snack.filter(Boolean),
        updatedAt: now,
      };
      if (editingId) {
        await updateDoc(
          doc(db, 'schools', schoolId, 'foodMenus', editingId),
          data
        );
        setMenus((prev) =>
          prev.map((m) => (m.id === editingId ? { ...m, ...data } : m))
        );
      } else {
        await addDoc(collection(db, 'schools', schoolId, 'foodMenus'), data);
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Food menus</h1>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({ weekStart: '', breakfast: [], lunch: [], snack: [] });
            setMealInputs({ breakfast: '', lunch: '', snack: '' });
            setShowForm(true);
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add menu
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit menu' : 'New menu'}
          </h2>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Week start (Monday)
            </label>
            <input
              type="date"
              value={form.weekStart}
              onChange={(e) => setForm((f) => ({ ...f, weekStart: e.target.value }))}
              className="w-full max-w-xs rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>
          <MealItems
            label="Breakfast"
            items={form.breakfast}
            onAdd={() => addMealItem('breakfast')}
            onRemove={(idx) => removeMealItem('breakfast', idx)}
            inputValue={mealInputs.breakfast}
            onInputChange={(v) => setMealInputs((m) => ({ ...m, breakfast: v }))}
          />
          <MealItems
            label="Lunch"
            items={form.lunch}
            onAdd={() => addMealItem('lunch')}
            onRemove={(idx) => removeMealItem('lunch', idx)}
            inputValue={mealInputs.lunch}
            onInputChange={(v) => setMealInputs((m) => ({ ...m, lunch: v }))}
          />
          <MealItems
            label="Snack"
            items={form.snack}
            onAdd={() => addMealItem('snack')}
            onRemove={(idx) => removeMealItem('snack', idx)}
            inputValue={mealInputs.snack}
            onInputChange={(v) => setMealInputs((m) => ({ ...m, snack: v }))}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.weekStart}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add menu'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {menus.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">
                Week of {new Date(m.weekStart).toLocaleDateString()}
              </p>
              <button
                type="button"
                onClick={() => startEdit(m)}
                className="text-primary-600 hover:underline text-sm"
              >
                Edit
              </button>
            </div>
            <ul className="mt-2 text-sm text-slate-600 space-y-1">
              <li>
                <span className="font-medium text-slate-700">Breakfast:</span>{' '}
                {m.breakfast?.length ? m.breakfast.join(', ') : '—'}
              </li>
              <li>
                <span className="font-medium text-slate-700">Lunch:</span>{' '}
                {m.lunch?.length ? m.lunch.join(', ') : '—'}
              </li>
              <li>
                <span className="font-medium text-slate-700">Snack:</span>{' '}
                {m.snack?.length ? m.snack.join(', ') : '—'}
              </li>
            </ul>
          </div>
        ))}
      </div>
      {menus.length === 0 && !showForm && (
        <p className="text-slate-500">No menus yet. Add a menu to get started.</p>
      )}
    </div>
  );
}
