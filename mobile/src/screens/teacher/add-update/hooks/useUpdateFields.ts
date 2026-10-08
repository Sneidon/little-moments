import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import type { MealOption, ReportType } from '@shared/types';
import { defaultFields, formatClock } from '../constants';
import type { UpdateFields } from '../types';

export function useClock() {
  const [clock, setClock] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export function useMealOptions(schoolId: string | undefined) {
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);
  useEffect(() => {
    if (!schoolId) return;
    return onSnapshot(collection(db, 'schools', schoolId, 'mealOptions'), (snap) =>
      setMealOptions(snap.docs.map((d) => ({ ...(d.data() as MealOption), id: d.id })))
    );
  }, [schoolId]);
  return mealOptions;
}

export function useUpdateFields(type: ReportType, mealOptions: MealOption[]) {
  const [fields, setFields] = useState<UpdateFields>(defaultFields);
  const patch = useCallback((p: Partial<UpdateFields>) => setFields((f) => ({ ...f, ...p })), []);

  useEffect(() => {
    if (type !== 'meal') return;
    setFields((f) => {
      const stillValid = mealOptions.some((o) => o.id === f.mealOptionId && o.category === f.mealType);
      return f.mealOptionId && !stillValid ? { ...f, mealOptionId: null, mealOptionName: '' } : f;
    });
  }, [type, mealOptions, fields.mealType]);

  return { fields, patch };
}
