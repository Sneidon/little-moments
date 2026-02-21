'use client';

import type { UseMealOptionFormResult } from '@/hooks/useMealOptionForm';
import { MEAL_CATEGORY_LABELS } from '@/constants/mealOptions';

const inputBase =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const inputFile =
  'text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1 file:text-primary-700';

export interface MealOptionFormProps {
  form: UseMealOptionFormResult;
}

export function MealOptionForm({ form }: MealOptionFormProps) {
  const {
    editingId,
    formCategory,
    form: formState,
    setForm,
    submitting,
    submit,
    resetForm,
    canSubmit,
  } = form;

  return (
    <form onSubmit={submit} className="card mb-8 p-6">
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
        {editingId ? 'Edit option' : `New ${MEAL_CATEGORY_LABELS[formCategory]} option`}
      </h2>
      {!editingId && (
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Category: <strong>{MEAL_CATEGORY_LABELS[formCategory]}</strong>
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Scrambled eggs & toast"
            className={`${inputBase} w-full max-w-md`}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description (optional)
          </label>
          <textarea
            value={formState.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description of the meal"
            rows={2}
            className={`${inputBase} w-full max-w-md resize-y`}
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
            className={`${inputBase} w-full max-w-md ${inputFile}`}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="btn-primary"
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
  );
}
