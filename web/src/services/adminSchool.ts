import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

/** Suspend billing / staff & parent Firestore access, or restore. Callable: super_admin only. */
export async function adminSetSchoolSuspended(params: { schoolId: string; suspended: boolean }): Promise<void> {
  const fn = httpsCallable<{ schoolId: string; suspended: boolean }, { ok: true }>(
    getFunctions(app),
    'adminSetSchoolSuspended'
  );
  await fn(params);
}

/**
 * Queues full deletion after 7 business days (Mon–Fri UTC). Suspends the school immediately.
 * Callable: super_admin only. Confirmation must equal the school's current name (trimmed).
 */
export async function adminQueueSchoolDeletion(params: {
  schoolId: string;
  confirmation: string;
}): Promise<{ jobId: string; scheduledDeleteAt: string }> {
  const fn = httpsCallable<
    { schoolId: string; confirmation: string },
    { ok: true; jobId: string; scheduledDeleteAt: string }
  >(getFunctions(app), 'adminQueueSchoolDeletion');
  const { data } = await fn(params);
  return { jobId: data.jobId, scheduledDeleteAt: data.scheduledDeleteAt };
}

/** Cancels a pending deletion job and reactivates the school when the Firestore doc still exists. super_admin only. */
export async function adminCancelSchoolDeletion(params: { jobId: string }): Promise<void> {
  const fn = httpsCallable<{ jobId: string }, { ok: true }>(
    getFunctions(app),
    'adminCancelSchoolDeletion'
  );
  await fn(params);
}
