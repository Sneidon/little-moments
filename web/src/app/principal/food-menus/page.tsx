'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMealOptions } from '@/hooks/useMealOptions';
import { useMealOptionForm } from '@/hooks/useMealOptionForm';
import { MealOptionCard } from '@/components/MealOptionCard';
import { MealOptionForm } from '@/components/MealOptionForm';
import { MEAL_CATEGORIES, MEAL_CATEGORY_LABELS } from '@/constants/mealOptions';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

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
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Meal options</span>}
        subtitle="Define options for breakfast, lunch and snacks. Teachers will select from this list when logging meals."
        actions={
          <Link
            href="/principal/food-menus/weekly"
            className="btn-secondary shrink-0"
          >
            Weekly menu
          </Link>
        }
      />

      {form.showForm && <MealOptionForm form={form} />}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton />
        </SectionCard>
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
