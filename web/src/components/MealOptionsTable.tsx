'use client';

import type { MealOption } from 'shared/types';
import { MEAL_CATEGORY_LABELS } from '@/constants/mealOptions';
import type { MealCategory } from '@/constants/mealOptions';
import { SectionCard } from '@/components/ui';

export interface MealOptionsTableProps {
  options: MealOption[];
  onEdit: (option: MealOption) => void;
  onDelete: (option: MealOption) => void;
  onAddOption: (category: MealCategory) => void;
}

export function MealOptionsTable({
  options,
  onEdit,
  onDelete,
  onAddOption,
}: MealOptionsTableProps) {
  return (
    <SectionCard topBar="accent" padding="none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Meal options</span>
        <div className="flex flex-wrap gap-2">
          {(['breakfast', 'lunch', 'snack'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onAddOption(cat)}
              className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add {MEAL_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead className="bg-slate-50/80 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Category</th>
              <th className="w-0 px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Image</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Description</th>
              <th className="w-0 px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => (
              <tr key={opt.id} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {MEAL_CATEGORY_LABELS[opt.category]}
                </td>
                <td className="px-4 py-3">
                  {opt.imageUrl ? (
                    <div
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
                      title={`Image for ${opt.name}`}
                    >
                      <img
                        src={opt.imageUrl}
                        alt={opt.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
                      title="No image uploaded"
                    >
                      None
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{opt.name}</td>
                <td className="max-w-[280px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={opt.description || undefined}>
                  {opt.description || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(opt)}
                      className="btn-secondary shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(opt)}
                      className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {options.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No meal options yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Use the buttons above to add options for breakfast, lunch, or snacks.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
