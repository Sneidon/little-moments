import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';

export function useSchoolUsers(schoolId: string | undefined) {
  const [schoolName, setSchoolName] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [schoolSnap, usersSnap] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      ]);
      if (!schoolSnap.exists()) {
        setError('School not found');
        return;
      }
      setSchoolName((schoolSnap.data() as { name?: string }).name ?? schoolId);
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setError(null);
    load().finally(() => setLoading(false));
  }, [schoolId, load]);

  return { schoolName, users, loading, error };
}
