import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTeacherClasses } from '../api/classes';
import type { ClassRoom } from '@shared/types';

export function useTeacherClasses(refreshTrigger = 0) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const uid = profile?.uid;
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId || !uid) {
      setClasses([]);
      return;
    }
    setClasses(await fetchTeacherClasses(schoolId, uid));
  }, [schoolId, uid]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, refreshTrigger]);

  return { classes, loading };
}
