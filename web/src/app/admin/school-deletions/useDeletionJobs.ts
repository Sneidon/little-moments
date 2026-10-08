import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where, type QuerySnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { SchoolDeletionJob } from 'shared/types';

const toJobs = (snap: QuerySnapshot) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolDeletionJob, 'id'>) }));

export function useDeletionJobs() {
  const [pending, setPending] = useState<SchoolDeletionJob[]>([]);
  const [history, setHistory] = useState<SchoolDeletionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const jobs = collection(db, 'schoolDeletionJobs');
    const unsubPending = onSnapshot(
      query(jobs, where('status', '==', 'pending'), orderBy('scheduledDeleteAt', 'asc')),
      (snap) => {
        setPending(toJobs(snap));
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    const unsubHistory = onSnapshot(
      query(jobs, where('status', 'in', ['completed', 'cancelled', 'failed']), orderBy('resolvedAt', 'desc'), limit(200)),
      (snap) => setHistory(toJobs(snap)),
      (e) => setError((prev) => prev ?? e.message)
    );
    return () => {
      unsubPending();
      unsubHistory();
    };
  }, []);

  return { pending, history, loading, error };
}
