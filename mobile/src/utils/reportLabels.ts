/** Human-readable labels for meal categories stored on daily reports. */
export const MEAL_CATEGORY_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
};

export function formatMealCategoryLabel(mealType?: string | null): string | null {
  if (!mealType || typeof mealType !== 'string') return null;
  const key = mealType.trim().toLowerCase();
  if (MEAL_CATEGORY_LABELS[key]) return MEAL_CATEGORY_LABELS[key];
  const t = mealType.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : null;
}

/** How much the child ate — values from the teacher meal log form. */
export const MEAL_AMOUNT_LABELS: Record<string, string> = {
  none: 'None',
  little: 'A little',
  half: 'Half',
  most: 'Most',
  all: 'All',
};

export function formatMealAmount(mealAmount?: string | null): string | null {
  if (!mealAmount || typeof mealAmount !== 'string') return null;
  const key = mealAmount.trim().toLowerCase();
  if (MEAL_AMOUNT_LABELS[key]) return MEAL_AMOUNT_LABELS[key];
  const t = mealAmount.trim();
  return t || null;
}
