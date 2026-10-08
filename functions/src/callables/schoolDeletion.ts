import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireCallerProfile } from '../lib/auth';
import { userHasRole } from '../lib/roles';
import { addBusinessDaysUtc, isoNow } from '../lib/util';

/**
 * Schedules full data deletion after 7 business days (UTC Mon–Fri). Suspends the school immediately.
 * Callable by super_admin only. `confirmation` must match school name (trimmed).
 */
export const adminQueueSchoolDeletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (!userHasRole(caller, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can queue school deletion.');
  }
  const { schoolId, confirmation } = data as { schoolId?: string; confirmation?: string };
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  if (!confirmation || typeof confirmation !== 'string' || !confirmation.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'confirmation must match the school name.');
  }
  const sid = schoolId.trim();

  const dup = await db
    .collection('schoolDeletionJobs')
    .where('schoolId', '==', sid)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!dup.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'A deletion is already scheduled for this school. Cancel it first or wait for it to complete.'
    );
  }

  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const schoolName = (schoolSnap.data() as { name?: string }).name;
  const expectedName = (schoolName && String(schoolName).trim()) || '';
  if (!expectedName || confirmation.trim() !== expectedName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Confirmation does not match this school\'s name. Type the exact name to continue.'
    );
  }

  let requestedByEmail: string | null = null;
  try {
    const u = await admin.auth().getUser(context.auth.uid);
    requestedByEmail = u.email ?? null;
  } catch {
  }

  const now = isoNow();
  const scheduledDeleteAt = addBusinessDaysUtc(new Date(), 7).toISOString();
  const jobRef = db.collection('schoolDeletionJobs').doc();
  const batch = db.batch();
  batch.set(jobRef, {
    schoolId: sid,
    schoolName: expectedName,
    status: 'pending',
    requestedAt: now,
    scheduledDeleteAt,
    requestedByUid: context.auth.uid,
    requestedByEmail,
  });
  batch.update(schoolRef, {
    subscriptionStatus: 'suspended',
    status: 'SUSPENDED',
    updatedAt: now,
  });
  await batch.commit();

  return { ok: true as const, jobId: jobRef.id, scheduledDeleteAt };
});

/** Cancel a pending deletion job and reactivate the school if the document still exists. */
export const adminCancelSchoolDeletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (!userHasRole(caller, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can cancel scheduled deletions.');
  }
  const { jobId } = data as { jobId?: string };
  if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId is required.');
  }
  const ref = db.collection('schoolDeletionJobs').doc(jobId.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Job not found.');
  const row = snap.data() as { status?: string; schoolId?: string };
  if (row.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Only pending jobs can be cancelled.');
  }
  const sid = row.schoolId ? String(row.schoolId).trim() : '';
  if (!sid) throw new functions.https.HttpsError('failed-precondition', 'Invalid job payload.');
  const now = isoNow();
  await ref.update({
    status: 'cancelled',
    resolvedAt: now,
    cancelledByUid: context.auth.uid,
  });
  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (schoolSnap.exists) {
    await schoolRef.update({
      subscriptionStatus: 'active',
      status: 'ACTIVE',
      updatedAt: now,
    });
  }
  return { ok: true as const };
});
