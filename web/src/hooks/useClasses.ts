'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ClassRoom } from 'shared/types';

export interface UseClassesResult {
  classes: ClassRoom[];
  loading: boolean;
  setClasses: React.Dispatch<React.SetStateAction<ClassRoom[]>>;
}

export function useClasses(schoolId: string | undefined): UseClassesResult {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, 'schools', schoolId, 'classes'))
      .then((snap) => {
        setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  return { classes, loading, setClasses };
}
