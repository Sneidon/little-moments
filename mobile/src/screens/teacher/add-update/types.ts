export type MealType = 'breakfast' | 'lunch' | 'snack';

export type UpdateFields = {
  mealType: MealType;
  mealAmount: string;
  mealOptionId: string | null;
  mealOptionName: string;
  nappyType: string;
  nappyCondition: string;
  napStartTime: string;
  napEndTime: string;
  sleepQuality: string;
  activityType: string | null;
  activityTitle: string;
  activityDescription: string;
  medicationName: string;
  medicationDosage: string;
  notes: string;
  photoCategory: string | null;
};

export type ChildFormOverrides = Partial<UpdateFields>;

export type FieldsChange = (patch: Partial<UpdateFields>) => void;

export type FormVariant = 'main' | 'variation';
