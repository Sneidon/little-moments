import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MAX_PARENTS_PER_CHILD } from '../lib/config';
import { sendParentInviteEmail, sendTeacherInviteEmail } from '../lib/email/invites';
import { RoleProfileSlice, userHasRole } from '../lib/roles';
import { addDays, isValidEmail, isoNow, randomToken } from '../lib/util';

/** Principal sends teacher an email invite; they set a password via acceptInviteToken. */
export const principalInviteTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite teachers.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, classId } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    classId?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  const emailNorm = teacherEmail.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const schoolData = schoolSnap.data() as { name?: string; principalName?: string };
  const schoolName = (schoolData.name ?? 'Your school').trim();
  const principalDisplayNameEmail =
    schoolData.principalName && schoolData.principalName.trim()
      ? schoolData.principalName.trim()
      : undefined;

  let inviteClassLabel: string | undefined;
  if (classId && typeof classId === 'string' && classId.trim()) {
    const cSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(classId.trim()).get();
    if (cSnap.exists) {
      const n = (cSnap.data() as { name?: string }).name;
      inviteClassLabel = n && typeof n === 'string' && n.trim() ? n.trim() : undefined;
    }
  }

  try {
    const existingAuth = await admin.auth().getUserByEmail(emailNorm);
    const prof = await db.collection('users').doc(existingAuth.uid).get();
    const p = prof.exists ? (prof.data() as RoleProfileSlice) : null;
    if (userHasRole(p, 'teacher') && p?.schoolId === schoolId) {
      throw new functions.https.HttpsError(
        'already-exists',
        'This teacher is already part of your school.'
      );
    }
    if (userHasRole(p, 'teacher') && p?.schoolId && p.schoolId !== schoolId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This email belongs to a teacher at another school.'
      );
    }
    // Existing account still gets an invite; accept adds the role without a new password.
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const tok = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token: tok,
    email: emailNorm,
    role: 'teacher',
    schoolId,
    schoolName,
    expiresAt,
    createdAt: now,
  };
  if (teacherDisplayName && typeof teacherDisplayName === 'string' && teacherDisplayName.trim()) {
    payload.inviteeDisplayName = teacherDisplayName.trim();
  }
  if (teacherPreferredName && typeof teacherPreferredName === 'string' && teacherPreferredName.trim()) {
    payload.inviteePreferredName = teacherPreferredName.trim();
  }
  if (inviteClassLabel) payload.className = inviteClassLabel;
  await db.collection('inviteTokens').doc(tok).set(payload);

  await sendTeacherInviteEmail({
    to: emailNorm,
    schoolName,
    principalName: principalDisplayNameEmail,
    className: inviteClassLabel,
    inviteeName: typeof teacherDisplayName === 'string' ? teacherDisplayName.trim() || undefined : undefined,
    token: tok,
  });

  return { token: tok, expiresAt };
});

/** Principal emails a parent invite for one child — accept links them via acceptInviteToken. */
export const principalInviteParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (!userHasRole(callerData, 'principal') || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const {
    childId,
    parentEmail,
    parentDisplayName,
    parentPhone,
  } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPhone?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }
  const emailNorm = parentEmail.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId.trim());
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const childData = childSnap.data() as { name?: string; parentIds?: string[] };
  const parentIds = childData.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolData = schoolSnap.data() as { name?: string; principalName?: string };
  const schoolName = (schoolData?.name ?? 'Your school').trim();
  const principalDisplayNameEmail =
    schoolData.principalName && schoolData.principalName.trim()
      ? schoolData.principalName.trim()
      : undefined;
  const childName = (childData.name && childData.name.trim()) ? childData.name.trim() : 'your child';

  try {
    const existingAuth = await admin.auth().getUserByEmail(emailNorm);
    if (parentIds.includes(existingAuth.uid)) {
      throw new functions.https.HttpsError('failed-precondition', 'This parent is already linked to this child.');
    }
    // Existing account still gets an invite; accept adds parent access without a new password.
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const tok = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token: tok,
    email: emailNorm,
    role: 'parent',
    schoolId,
    childId: childId.trim(),
    schoolName,
    childName,
    expiresAt,
    createdAt: now,
  };
  if (parentDisplayName && typeof parentDisplayName === 'string' && parentDisplayName.trim()) {
    payload.inviteeDisplayName = parentDisplayName.trim();
  }
  if (parentPhone && typeof parentPhone === 'string' && parentPhone.trim()) {
    payload.inviteePhone = parentPhone.trim();
  }
  await db.collection('inviteTokens').doc(tok).set(payload);

  await sendParentInviteEmail({
    to: emailNorm,
    schoolName,
    principalName: principalDisplayNameEmail,
    childName,
    inviteeName: typeof parentDisplayName === 'string' ? parentDisplayName.trim() || undefined : undefined,
    token: tok,
  });

  return { token: tok, expiresAt };
});
