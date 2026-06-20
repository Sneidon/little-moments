import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Child } from '../../../shared/types';
import { loadPresentChildIdsForDate } from '../utils/childPresence';

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function usePresentChildIds(schoolId: string | undefined, children: Child[]) {
  const [presentChildIds, setPresentChildIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const childIdsKey = children
    .map((c) => c.id)
    .sort()
    .join(',');

  useFocusEffect(
    useCallback(() => {
      if (!schoolId || children.length === 0) {
        setPresentChildIds(new Set());
        setLoading(false);
        return;
      }

      let cancelled = false;
      setLoading(true);

      void loadPresentChildIdsForDate(
        schoolId,
        children.map((c) => c.id),
        todayDateStr()
      ).then((ids) => {
        if (!cancelled) {
          setPresentChildIds(ids);
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [schoolId, childIdsKey])
  );

  return { presentChildIds, loadingPresence: loading };
}
