'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Returns the school name for a given schoolId. Used for PDF exports and labels.
 */
export function useSchoolName(schoolId: string | undefined): string | null {
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setSchoolName(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'schools', schoolId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const name = (snap.data() as { name?: string }).name;
      if (name) setSchoolName(name);
    });
    return () => { cancelled = true; };
  }, [schoolId]);

  return schoolName;
}
