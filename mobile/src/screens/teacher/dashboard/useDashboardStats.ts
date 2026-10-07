import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { isChildPresentFromDayReports, loadDayReports } from '../../../utils/childPresence';
import type { Child } from '@shared/types';

type Stats = { meals: number; photos: number; presentIds: Set<string> };

const EMPTY: Stats = { meals: 0, photos: 0, presentIds: new Set() };

export function useDashboardStats(schoolId: string | undefined, children: Child[], date: string, refreshTrigger: number) {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      if (!schoolId || children.length === 0) {
        setStats(EMPTY);
        return;
      }
      let cancelled = false;
      Promise.all(children.map((c) => loadDayReports(schoolId, c.id, date).then((reports) => ({ id: c.id, reports })))).then(
        (perChild) => {
          if (cancelled) return;
          const all = perChild.flatMap((p) => p.reports);
          setStats({
            meals: all.filter((r) => r.type === 'meal').length,
            photos: all.filter((r) => r.type === 'incident').length,
            presentIds: new Set(perChild.filter((p) => isChildPresentFromDayReports(p.reports)).map((p) => p.id)),
          });
        }
      );
      return () => {
        cancelled = true;
      };
    }, [schoolId, children, date, refreshTrigger])
  );

  return stats;
}
