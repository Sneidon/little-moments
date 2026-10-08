import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendPrincipalInviteEmail, sendSuperAdminInviteEmail } from '../../lib/email/invites';
import { RoleProfileSlice, userHasRole } from '../../lib/roles';
import { addDays, isoNow, randomToken } from '../../lib/util';

// Resend principal invite. Reissues token when invite is already used or expired.
export const resendPrincipalInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerProfile = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerProfile, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can resend principal invites.');
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
    schoolName?: string;
    principalName?: string;
    logoUrl?: string;
    expiresAt: string;
    usedAt?: string;
    createdSchoolId?: string;
  };
  if (invite.role !== 'principal') {
    throw new functions.https.HttpsError('failed-precondition', 'Only principal invites can be resent.');
  }
  if (invite.createdSchoolId) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite already accepted.');
  }

  const now = isoNow();
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const needsReissue = Boolean(invite.usedAt) || expired;

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
      schoolName: invite.schoolName ?? 'School',
      expiresAt: expiresAtToReturn,
      createdAt: now,
      resentFromInviteId: inviteRef.id,
    };
    if (invite.principalName) payload.principalName = invite.principalName;
    if (invite.logoUrl) payload.logoUrl = invite.logoUrl;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  await sendPrincipalInviteEmail({
    to: invite.email,
    schoolName: invite.schoolName ?? 'School',
    principalName: invite.principalName,
    token: tokenToSend,
  });

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});

/** Resend super admin invite token (reuse or reissue when used/expired). */
export const resendSuperAdminInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerProfile = callerSnap.exists ? (callerSnap.data() as RoleProfileSlice) : null;
  if (!userHasRole(callerProfile, 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can resend admin invites.');
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
    inviteeDisplayName?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.role !== 'super_admin') {
    throw new functions.https.HttpsError('failed-precondition', 'Only super admin invites can be resent from this action.');
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
    if (invite.inviteeDisplayName) payload.inviteeDisplayName = invite.inviteeDisplayName;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  await sendSuperAdminInviteEmail({
    to: invite.email,
    inviteeName: invite.inviteeDisplayName,
    token: tokenToSend,
  });

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});
