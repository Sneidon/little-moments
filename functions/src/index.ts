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
    description,
    website,
    principalEmail,
    principalDisplayName,
    principalPassword,
  } = data as {
    name?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
    website?: string;
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
    description: description && typeof description === 'string' ? description.trim() || undefined : undefined,
    website: website && typeof website === 'string' ? website.trim() || undefined : undefined,
    subscriptionStatus: 'active',
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

// Create a teacher for the principal's school. Callable by principal only.
// Creates Auth user + users/{uid} profile with role=teacher, schoolId=principal's schoolId.
export const createTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can add teachers to their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, teacherPassword } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    teacherPassword?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  if (!teacherPassword || typeof teacherPassword !== 'string' || teacherPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: teacherEmail.trim(),
    password: teacherPassword,
    displayName: (teacherDisplayName && typeof teacherDisplayName === 'string')
      ? teacherDisplayName.trim()
      : teacherEmail.trim(),
  });
  const teacherUid = userRecord.uid;

  const displayName = (teacherDisplayName && typeof teacherDisplayName === 'string')
    ? teacherDisplayName.trim()
    : teacherEmail.trim();
  const preferredName = (teacherPreferredName && typeof teacherPreferredName === 'string')
    ? teacherPreferredName.trim()
    : null;
  await db.collection('users').doc(teacherUid).set({
    email: teacherEmail.trim(),
    displayName,
    ...(preferredName ? { preferredName } : {}),
    role: 'teacher',
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  return { teacherUid };
});

const MAX_PARENTS_PER_CHILD = 4;

// Invite a parent to a child. Callable by principal only. Creates Auth user + users doc (role=parent)
// and adds the parent's uid to the child's parentIds (max 4 parents per child).
export const inviteParentToChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentEmail, parentDisplayName, parentPassword } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPassword?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }
  if (!parentPassword || typeof parentPassword !== 'string' || parentPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent password must be at least 6 characters.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: parentEmail.trim(),
    password: parentPassword,
    displayName: (parentDisplayName && typeof parentDisplayName === 'string')
      ? parentDisplayName.trim()
      : parentEmail.trim(),
  });
  const parentUid = userRecord.uid;

  await db.collection('users').doc(parentUid).set({
    email: parentEmail.trim(),
    displayName: (parentDisplayName && typeof parentDisplayName === 'string')
      ? parentDisplayName.trim()
      : parentEmail.trim(),
    role: 'parent',
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  const newParentIds = [...parentIds, parentUid];
  await childRef.update({
    parentIds: newParentIds,
    updatedAt: now,
  });

  return { parentUid };
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
