'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { MealOption } from 'shared/types';
import type { MealCategory } from '@/constants/mealOptions';

export interface UseMealOptionsResult {
  options: MealOption[];
  optionsByCategory: (category: MealCategory) => MealOption[];
  loading: boolean;
}

export function useMealOptions(schoolId: string | undefined): UseMealOptionsResult {
  const [options, setOptions] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(!!schoolId);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'schools', schoolId, 'mealOptions'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealOption));
      list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setOptions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [schoolId]);

  const optionsByCategory = useMemo(
    () => (category: MealCategory) => options.filter((o) => o.category === category),
    [options]
  );

  return { options, optionsByCategory, loading };
}
