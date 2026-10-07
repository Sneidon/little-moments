import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { buildMealOptionImageMap } from '../../utils/childDailyReportDisplay';
import type { MealOption } from '@shared/types';

export function useMealOptionImages(schoolId: string | undefined) {
  const [options, setOptions] = useState<MealOption[]>([]);
  useEffect(() => {
    if (!schoolId) return;
    return onSnapshot(collection(db, 'schools', schoolId, 'mealOptions'), (snap) => {
      setOptions(snap.docs.map((d) => ({ ...(d.data() as MealOption), id: d.id })));
    });
  }, [schoolId]);
  return useMemo(() => buildMealOptionImageMap(options), [options]);
}
