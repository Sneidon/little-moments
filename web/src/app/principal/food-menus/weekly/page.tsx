'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useMealOptions } from '@/hooks/useMealOptions';
import { MEAL_CATEGORIES, MEAL_CATEGORY_LABELS } from '@/constants/mealOptions';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export default function FoodMenuWeeklyPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { options, optionsByCategory, loading } = useMealOptions(schoolId);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [menu, setMenu] = useState<Record<string, Record<string, string[]>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const ref = doc(db, 'schools', schoolId, 'foodMenusWeekly', weekStart);
      const snap = await getDoc(ref);
      setMenu((snap.data()?.days as Record<string, Record<string, string[]>>) ?? {});
    })();
  }, [schoolId, weekStart]);

  const toggleMeal = (dayIdx: number, category: string, optionName: string) => {
    const key = String(dayIdx);
    setMenu((prev) => {
      const day = prev[key] ?? { breakfast: [], lunch: [], snack: [] };
      const list = day[category] ?? [];
      const has = list.includes(optionName);
      const next = { ...day, [category]: has ? list.filter((x) => x !== optionName) : [...list, optionName] };
      return { ...prev, [key]: next };
    });
  };

  const save = async () => {
    if (!schoolId) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'schools', schoolId, 'foodMenusWeekly', weekStart), {
        schoolId,
        weekStart,
        days: menu,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  if (!schoolId || loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Weekly food menu
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Assign meal options to each day. Parents and teachers can view the weekly plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevWeek} className="btn-secondary">
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Week of {new Date(weekStart).toLocaleDateString()}
          </span>
          <button type="button" onClick={nextWeek} className="btn-secondary">
            Next →
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-200">Day</th>
              {MEAL_CATEGORIES.map((cat) => (
                <th key={cat} className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                  {MEAL_CATEGORY_LABELS[cat]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((dayName, dayIdx) => (
              <tr key={dayIdx} className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{dayName}</td>
                {MEAL_CATEGORIES.map((category) => (
                  <td key={category} className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {optionsByCategory(category).map((opt) => {
                        const day = menu[String(dayIdx)] ?? {};
                        const list = day[category] ?? [];
                        const checked = list.includes(opt.name);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleMeal(dayIdx, category, opt.name)}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              checked
                                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                      {optionsByCategory(category).length === 0 && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
