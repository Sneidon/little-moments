/**
 * My Little Moments - Firebase Cloud Functions
 * Per proposal: notifications (FCM + SendGrid), event reminders, media validation.
 * Custom claims for role-based access (role, schoolId) set when user profile is created/updated.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Set custom claims when a user document is created or updated in Firestore
// so that request.auth.token.role and request.auth.token.schoolId are available in security rules.
export const setUserClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;
    if (!data || !userId) return null;
    const role = data.role as string | undefined;
    const schoolId = data.schoolId as string | undefined;
    const claims: Record<string, string> = {};
    if (role) claims.role = role;
    if (schoolId) claims.schoolId = schoolId;
    try {
      await admin.auth().setCustomUserClaims(userId, claims);
    } catch (e) {
      functions.logger.error('setUserClaims failed', userId, e);
    }
    return null;
  });

// When a daily report is created, trigger notifications (FCM + SendGrid).
// Proposal: "Trigger notifications via SendGrid for emails and Firebase Cloud Messaging
// when a teacher submits a daily report."
export const onReportCreated = functions.firestore
  .document('schools/{schoolId}/children/{childId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { schoolId, childId } = context.params;
    const report = snap.data();
    functions.logger.info('Report created', { schoolId, childId, type: report?.type });
    // TODO: Fetch child's parentIds from schools/{schoolId}/children/{childId}
    // TODO: Fetch parent FCM tokens from users collection
    // TODO: Send FCM to parent devices
    // TODO: Call SendGrid API to send email to parents
    return null;
  });

// Sync custom claims from the caller's Firestore user document to their Auth token.
// Call this after login so Firestore rules (which use request.auth.token.role) work.
export const syncClaims = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    return { ok: false, message: 'No user profile' };
  }
  const data = snap.data() as { role?: string; schoolId?: string };
  const claims: Record<string, string> = {};
  if (data.role) claims.role = data.role;
  if (data.schoolId) claims.schoolId = data.schoolId;
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true };
});

// Create a school and a principal user in one step (direct add, no invitation).
// Callable by super_admin only. Creates: Auth user (principal), school doc, users/{uid} profile.
// setUserClaims trigger will set custom claims for the new principal.
export const createSchoolWithPrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can create schools.');
  }

  const {
    name,
    address,
    contactEmail,
    contactPhone,
    principalEmail,
    principalDisplayName,
    principalPassword,
  } = data as {
    name?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    principalEmail?: string;
    principalDisplayName?: string;
    principalPassword?: string;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'School name is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal email is required.');
  }
  if (!principalPassword || typeof principalPassword !== 'string' || principalPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: principalEmail.trim(),
    password: principalPassword,
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
  });
  const principalUid = userRecord.uid;

  const schoolRef = db.collection('schools').doc();
  await schoolRef.set({
    name: name.trim(),
    address: address && typeof address === 'string' ? address.trim() || undefined : undefined,
    contactEmail: contactEmail && typeof contactEmail === 'string' ? contactEmail.trim() || undefined : undefined,
    contactPhone: contactPhone && typeof contactPhone === 'string' ? contactPhone.trim() || undefined : undefined,
    createdAt: now,
    updatedAt: now,
  });
  const schoolId = schoolRef.id;

  await db.collection('users').doc(principalUid).set({
    email: principalEmail.trim(),
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
    role: 'principal',
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  return { schoolId, principalUid };
});

// Scheduled event reminders (one day before). Proposal: "Schedule event reminders one day
// before using Cloud Scheduler, delivering via FCM and SendGrid."
// Use a callable or HTTP function triggered by Cloud Scheduler (cron).
export const sendEventReminders = functions.pubsub
  .schedule('0 8 * * *') // 8 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    // TODO: Query events where startAt is between tomorrow and tomorrowEnd
    // TODO: For each event, get target users and send FCM + SendGrid
    functions.logger.info('Event reminders run');
    return null;
  });
