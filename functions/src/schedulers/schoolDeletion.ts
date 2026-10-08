import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { claimSchoolDeletionJob, runSchoolDeletionPurge } from '../lib/schoolDeletion';
import { isoNow } from '../lib/util';

/** Picks due jobs and deletes school data after the 7-business-day waiting period. */
export const processSchoolDeletionJobs = functions.pubsub.schedule('every 30 minutes').onRun(async () => {
  const db = admin.firestore();
  const nowIso = isoNow();
  const due = await db
    .collection('schoolDeletionJobs')
    .where('status', '==', 'pending')
    .where('scheduledDeleteAt', '<=', nowIso)
    .limit(25)
    .get();

  for (const jobDoc of due.docs) {
    const jobRef = jobDoc.ref;
    const row = jobDoc.data() as { schoolId?: string };
    const schoolId = row.schoolId ? String(row.schoolId).trim() : '';
    if (!schoolId) {
      await jobRef.update({
        status: 'failed',
        resolvedAt: nowIso,
        errorMessage: 'missing_schoolId_on_job',
      });
      continue;
    }

    const claimed = await claimSchoolDeletionJob(db, jobRef);
    if (!claimed) continue;

    try {
      await runSchoolDeletionPurge(db, schoolId);
      await jobRef.update({ status: 'completed', resolvedAt: isoNow() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      functions.logger.error('processSchoolDeletionJobs: purge failed', schoolId, e);
      await jobRef.update({
        status: 'failed',
        resolvedAt: isoNow(),
        errorMessage: msg.slice(0, 2000),
      });
    }
  }
  return null;
});
