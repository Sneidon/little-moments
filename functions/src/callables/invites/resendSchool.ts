import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendParentInviteEmail, sendTeacherInviteEmail } from '../../lib/email/invites';
import { userHasRole } from '../../lib/roles';
import { addDays, isoNow, randomToken } from '../../lib/util';

/** Resend teacher or parent invite. Super admin any school; principal only their school. */
export const resendSchoolInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};
  const isSuperAdminCaller = userHasRole(callerData, 'super_admin');
  const principalSchoolId =
    userHasRole(callerData, 'principal') && callerData.schoolId ? callerData.schoolId : null;
  if (!isSuperAdminCaller && !principalSchoolId) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot resend this invite.');
  }

  const { inviteId } = data as { inviteId?: string };
  if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'inviteId is required.');
  }
  const inviteRef = db.collection('inviteTokens').doc(inviteId.trim());
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found.');
  const invite = inviteSnap.data() as {
    token: string;
    email: string;
    role: string;
    schoolId?: string;
    schoolName?: string;
    childId?: string;
    childName?: string;
    className?: string;
    inviteeDisplayName?: string;
    inviteePreferredName?: string;
    inviteePhone?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.role !== 'teacher' && invite.role !== 'parent') {
    throw new functions.https.HttpsError('failed-precondition', 'Only teacher or parent invites can use this action.');
  }
  if (principalSchoolId && invite.schoolId !== principalSchoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Invite is not for your school.');
  }
  if (invite.usedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite already accepted.');
  }

  const now = isoNow();
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const needsReissue = expired;

  let tokenToSend = invite.token;
  let inviteIdToReturn = inviteRef.id;
  let expiresAtToReturn = invite.expiresAt;
  if (needsReissue) {
    tokenToSend = randomToken(24);
    expiresAtToReturn = addDays(new Date(), 7).toISOString();
    const payload: Record<string, unknown> = {
      token: tokenToSend,
      email: invite.email,
      role: invite.role,
      expiresAt: expiresAtToReturn,
      createdAt: now,
      resentFromInviteId: inviteRef.id,
    };
    if (invite.schoolId) payload.schoolId = invite.schoolId;
    if (invite.schoolName) payload.schoolName = invite.schoolName;
    if (invite.childId) payload.childId = invite.childId;
    if (invite.childName) payload.childName = invite.childName;
    if (invite.className) payload.className = invite.className;
    if (invite.inviteeDisplayName) payload.inviteeDisplayName = invite.inviteeDisplayName;
    if (invite.inviteePreferredName) payload.inviteePreferredName = invite.inviteePreferredName;
    if (invite.inviteePhone) payload.inviteePhone = invite.inviteePhone;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  const schoolName = invite.schoolName ?? 'Your school';
  let principalNameEmail: string | undefined;
  if ((invite.role === 'teacher' || invite.role === 'parent') && invite.schoolId) {
    const sSnap = await db.collection('schools').doc(invite.schoolId).get();
    if (sSnap.exists) {
      principalNameEmail = (sSnap.data() as { principalName?: string }).principalName?.trim() || undefined;
    }
  }
  if (invite.role === 'teacher') {
    await sendTeacherInviteEmail({
      to: invite.email,
      schoolName,
      principalName: principalNameEmail,
      className: invite.className,
      inviteeName: invite.inviteeDisplayName,
      token: tokenToSend,
    });
  } else {
    await sendParentInviteEmail({
      to: invite.email,
      schoolName,
      principalName: principalNameEmail,
      childName: invite.childName ?? 'your child',
      inviteeName: invite.inviteeDisplayName,
      token: tokenToSend,
    });
  }

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});
