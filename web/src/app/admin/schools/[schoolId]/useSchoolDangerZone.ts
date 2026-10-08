import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { adminCancelSchoolDeletion, adminQueueSchoolDeletion, adminSetSchoolSuspended } from '@/services/adminSchool';
import { getCallableErrorMessage } from '@/services/parents';
import type { School, SchoolDeletionJob } from 'shared/types';

export type DangerDialog = 'suspend' | 'reactivate' | 'queue' | 'cancel' | null;

export function useSchoolDangerZone(schoolId: string | undefined, school: School | null, refetch: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DangerDialog>(null);
  const [purgeName, setPurgeNameState] = useState('');
  const [deletionJob, setDeletionJob] = useState<SchoolDeletionJob | null>(null);

  useEffect(() => {
    if (!schoolId) return undefined;
    const q = query(collection(db, 'schoolDeletionJobs'), where('schoolId', '==', schoolId), where('status', 'in', ['pending', 'processing']));
    return onSnapshot(
      q,
      (snap) => setDeletionJob(snap.empty ? null : { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<SchoolDeletionJob, 'id'>) }),
      () => setDeletionJob(null)
    );
  }, [schoolId]);

  const run = useCallback(
    async (action: () => Promise<unknown>, after?: () => void) => {
      setError(null);
      setBusy(true);
      try {
        await action();
        setDialog(null);
        after?.();
        await refetch();
      } catch (e) {
        setError(getCallableErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [refetch]
  );

  const open = (next: DangerDialog) => {
    setError(null);
    setDialog(next);
  };

  return {
    busy,
    error,
    dialog,
    open,
    close: () => !busy && setDialog(null),
    purgeName,
    setPurgeName: (value: string) => {
      setPurgeNameState(value);
      setError(null);
    },
    deletionJob,
    suspend: () => schoolId && run(() => adminSetSchoolSuspended({ schoolId, suspended: true })),
    reactivate: () => schoolId && run(() => adminSetSchoolSuspended({ schoolId, suspended: false })),
    queueDeletion: () =>
      schoolId && school && run(() => adminQueueSchoolDeletion({ schoolId, confirmation: school.name.trim() }), () => setPurgeNameState('')),
    cancelDeletion: () => deletionJob?.id && run(() => adminCancelSchoolDeletion({ jobId: deletionJob.id })),
  };
}

export type SchoolDangerZone = ReturnType<typeof useSchoolDangerZone>;
