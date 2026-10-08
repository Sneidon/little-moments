import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendPrincipalInviteEmail, sendSuperAdminInviteEmail } from '../../lib/email/invites';
import { RoleProfileSlice, userHasRole } from '../../lib/roles';
import { addDays, isValidEmail, isoNow, randomToken } from '../../lib/util';

// Invite-based principal onboarding (preferred external onboarding).
// Callable by super_admin only. Creates inviteTokens/{token} doc only; school is created when the invite is accepted.
export const adminInvitePrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerProfile = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerProfile, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can invite principals.');
  }

  const { schoolName, principalName, principalEmail, logoUrl } = data as {
    schoolName?: string;
    principalName?: string;
    principalEmail?: string;
    schoolLogo?: string;
    logoUrl?: string;
  };
  if (!schoolName || typeof schoolName !== 'string' || !schoolName.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolName is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'principalEmail is required.');
  }

  const now = isoNow();

  const token = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const invitePayload: Record<string, unknown> = {
    token,
    email: principalEmail.trim(),
    role: 'principal',
    schoolName: schoolName.trim(),
    expiresAt,
    createdAt: now,
  };
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim()) {
    invitePayload.logoUrl = logoUrl.trim();
  }
  if (principalName && typeof principalName === 'string' && principalName.trim()) {
    invitePayload.principalName = principalName.trim();
  }
  await db.collection('inviteTokens').doc(token).set(invitePayload);

  await sendPrincipalInviteEmail({
    to: principalEmail.trim(),
    schoolName: schoolName.trim(),
    principalName: principalName?.trim(),
    token,
  });

  return { token, expiresAt, schoolName: schoolName.trim() };
});

/**
 * Invite an additional school admin (principal) to an existing school.
 * Callable by super_admin or a principal of that school.
 */
export const inviteSchoolPrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const caller = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;

  const { schoolId, principalEmail, principalName } = data as {
    schoolId?: string;
    principalEmail?: string;
    principalName?: string;
  };
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'principalEmail is required.');
  }
  const emailNorm = principalEmail.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }
  const sid = schoolId.trim();

  const isSuper = userHasRole(caller, 'super_admin');
  const isSchoolPrincipal = userHasRole(caller, 'principal') && caller?.schoolId === sid;
  if (!isSuper && !isSchoolPrincipal) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super admins or school admins can invite school administrators.'
    );
  }

  const schoolSnap = await db.collection('schools').doc(sid).get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const schoolData = schoolSnap.data() as { name?: string };
  const schoolName = (schoolData.name && schoolData.name.trim()) ? schoolData.name.trim() : 'your school';

  try {
    const existingAuth = await admin.auth().getUserByEmail(emailNorm);
    const prof = await db.collection('users').doc(existingAuth.uid).get();
    const p = prof.exists ? (prof.data() as RoleProfileSlice) : null;
    if (userHasRole(p, 'principal') && p?.schoolId === sid) {
      throw new functions.https.HttpsError(
        'already-exists',
        'This user is already a school admin at this school.'
      );
    }
    if (userHasRole(p, 'principal') && p?.schoolId && p.schoolId !== sid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This email is already a school admin at another school.'
      );
    }
    // Existing account still gets an invite; accept adds the role without a new password.
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const token = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const invitePayload: Record<string, unknown> = {
    token,
    email: emailNorm,
    role: 'principal',
    schoolId: sid,
    schoolName,
    expiresAt,
    createdAt: now,
  };
  if (principalName && typeof principalName === 'string' && principalName.trim()) {
    invitePayload.principalName = principalName.trim();
    invitePayload.inviteeDisplayName = principalName.trim();
  }
  await db.collection('inviteTokens').doc(token).set(invitePayload);

  await sendPrincipalInviteEmail({
    to: emailNorm,
    schoolName,
    principalName: principalName?.trim(),
    token,
    existingSchool: true,
  });

  return { token, expiresAt, schoolId: sid, schoolName };
});

/** Invite-only onboarding for additional super admins (same UX as principal school invites). */
export const adminInviteSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerProfile = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerProfile, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can invite administrators.');
  }

  const { email, displayName } = data as { email?: string; displayName?: string };
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  const emailNorm = email.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  try {
    const authUser = await admin.auth().getUserByEmail(emailNorm);
    const prof = await db.collection('users').doc(authUser.uid).get();
    if (prof.exists && userHasRole(prof.data() as RoleProfileSlice, 'super_admin')) {
      throw new functions.https.HttpsError('already-exists', 'This user is already a super administrator.');
    }
    // Existing account still gets an invite; accept adds the role without a new password.
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const token = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token,
    email: emailNorm,
    role: 'super_admin',
    expiresAt,
    createdAt: now,
  };
  if (displayName && typeof displayName === 'string' && displayName.trim()) {
    payload.inviteeDisplayName = displayName.trim();
  }
  await db.collection('inviteTokens').doc(token).set(payload);

  await sendSuperAdminInviteEmail({
    to: emailNorm,
    inviteeName: (displayName && typeof displayName === 'string') ? displayName.trim() || undefined : undefined,
    token,
  });

  return { token, expiresAt };
});
