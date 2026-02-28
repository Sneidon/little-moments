'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMealOptions } from '@/hooks/useMealOptions';
import { useMealOptionForm } from '@/hooks/useMealOptionForm';
import { MealOptionCard } from '@/components/MealOptionCard';
import { MealOptionForm } from '@/components/MealOptionForm';
import { MEAL_CATEGORIES, MEAL_CATEGORY_LABELS } from '@/constants/mealOptions';

function MealOptionsSkeleton() {
  return (
    <div className="space-y-8">
      {MEAL_CATEGORIES.map((category) => (
        <section key={category}>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-3/4 max-w-[200px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-full max-w-[280px] animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="h-5 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function FoodMenusPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { options, optionsByCategory, loading } = useMealOptions(schoolId);
  const form = useMealOptionForm({
    schoolId,
    options,
    optionsByCategory,
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Meal options
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Define options for breakfast, lunch and snacks. Teachers will select from this list when
          logging meals.
        </p>
        </div>
        <Link
          href="/principal/food-menus/weekly"
          className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Weekly menu
        </Link>
      </div>

      {form.showForm && <MealOptionForm form={form} />}

      {loading ? (
        <MealOptionsSkeleton />
      ) : (
        <div className="space-y-8">
          {MEAL_CATEGORIES.map((category) => (
            <section key={category}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {MEAL_CATEGORY_LABELS[category]}
                </h2>
                <button
                  type="button"
                  onClick={() => form.startAdd(category)}
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
                    <MealOptionCard
                      key={opt.id}
                      option={opt}
                      onEdit={() => form.startEdit(opt)}
                      onDelete={() => form.deleteOption(opt)}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
