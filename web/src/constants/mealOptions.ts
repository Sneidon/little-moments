export type MealCategory = 'breakfast' | 'lunch' | 'snack';

export const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'snack'];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snacks',
};
