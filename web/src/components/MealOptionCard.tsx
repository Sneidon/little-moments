'use client';

import type { MealOption } from 'shared/types';

export interface MealOptionCardProps {
  option: MealOption;
  onEdit: () => void;
  onDelete: () => void;
}

export function MealOptionCard({ option, onEdit, onDelete }: MealOptionCardProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
      {option.imageUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
          <img
            src={option.imageUrl}
            alt={option.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 text-sm">
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
