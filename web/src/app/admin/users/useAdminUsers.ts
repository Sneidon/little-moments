import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/config/firebase';
import { userHasRole } from '@/lib/roles';
import { callableErrorMessage } from './callableError';

export type SchoolUserCount = { id: string; name: string; userCount: number };
export type SuperAdminUser = { uid: string; email: string; displayName?: string };

type UserDoc = { uid: string; schoolId?: string; role?: string; email?: string; displayName?: string };

export function useAdminUsers() {
  const [schools, setSchools] = useState<SchoolUserCount[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRemove, setPendingRemove] = useState<SuperAdminUser | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [removed, setRemoved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [schoolsSnap, usersSnap] = await Promise.all([getDocs(collection(db, 'schools')), getDocs(collection(db, 'users'))]);
      const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserDoc);
      setSuperAdmins(users.filter((u) => userHasRole(u, 'super_admin')) as SuperAdminUser[]);
      setSchools(
        schoolsSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as { name?: string }).name ?? d.id,
          userCount: users.filter((u) => u.schoolId === d.id).length,
        }))
      );
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    async (target: SuperAdminUser) => {
      setRemoveError('');
      setRemoved(false);
      setPendingRemove(null);
      setRemovingUid(target.uid);
      try {
        await httpsCallable<{ superAdminUid: string }, { ok: boolean }>(getFunctions(app), 'removeSuperAdmin')({ superAdminUid: target.uid });
        await load();
        setRemoved(true);
        window.setTimeout(() => setRemoved(false), 5000);
      } catch (err) {
        setRemoveError(callableErrorMessage(err));
      } finally {
        setRemovingUid(null);
      }
    },
    [load]
  );

  return {
    schools,
    superAdmins,
    loading,
    pendingRemove,
    setPendingRemove,
    removingUid,
    removeError,
    dismissRemoveError: () => setRemoveError(''),
    removed,
    dismissRemoved: () => setRemoved(false),
    remove,
  };
}
