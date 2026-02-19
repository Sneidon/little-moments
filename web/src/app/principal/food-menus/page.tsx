'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { FoodMenu } from 'shared/types';

export default function FoodMenusPage() {
  const { profile } = useAuth();
  const [menus, setMenus] = useState<FoodMenu[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [snack, setSnack] = useState('');
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !weekStart) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'schools', schoolId, 'foodMenus'), {
        schoolId,
        weekStart,
        breakfast: breakfast ? breakfast.split(',').map((s) => s.trim()).filter(Boolean) : [],
        lunch: lunch ? lunch.split(',').map((s) => s.trim()).filter(Boolean) : [],
        snack: snack ? snack.split(',').map((s) => s.trim()).filter(Boolean) : [],
        updatedAt: new Date().toISOString(),
      });
      setWeekStart('');
      setBreakfast('');
      setLunch('');
      setSnack('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Food menus</h1>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="mb-2 block text-sm font-medium text-slate-700">Week start (Monday)</label>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          placeholder="Breakfast (comma-separated)"
          value={breakfast}
          onChange={(e) => setBreakfast(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          placeholder="Lunch (comma-separated)"
          value={lunch}
          onChange={(e) => setLunch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          placeholder="Snack (comma-separated)"
          value={snack}
          onChange={(e) => setSnack(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={submitting || !weekStart}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add menu'}
        </button>
      </form>
      <div className="space-y-4">
        {menus.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-slate-800">
              Week of {new Date(m.weekStart).toLocaleDateString()}
            </p>
            <ul className="mt-2 text-sm text-slate-600">
              <li>Breakfast: {m.breakfast?.join(', ') || '—'}</li>
              <li>Lunch: {m.lunch?.join(', ') || '—'}</li>
              <li>Snack: {m.snack?.join(', ') || '—'}</li>
            </ul>
          </div>
        ))}
      </div>
      {menus.length === 0 && <p className="text-slate-500">No menus yet.</p>}
    </div>
  );
}
