import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AcceptContext, InviteDoc, trimmed } from '../../lib/inviteAccept/context';
import { acceptParentInvite } from '../../lib/inviteAccept/parent';
import { acceptPrincipalInvite } from '../../lib/inviteAccept/principal';
import { acceptSuperAdminInvite } from '../../lib/inviteAccept/superAdmin';
import { acceptTeacherInvite } from '../../lib/inviteAccept/teacher';
import { isoNow } from '../../lib/util';

// The token is a bearer secret, so this is callable without auth. Existing Auth users may omit password and name.
export const acceptInviteToken = functions.https.onCall(async (data, _context) => {
  const { token, password, displayName } = data as { token?: string; password?: string; displayName?: string };
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }

  const db = admin.firestore();
  const ref = db.collection('inviteTokens').doc(token.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Invite token not found.');
  const invite = snap.data() as InviteDoc;
  if (invite.usedAt) throw new functions.https.HttpsError('failed-precondition', 'This invite has already been accepted.');
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite token expired.');
  }

  const emailRaw = invite.email.trim();
  const ctx: AcceptContext = {
    db,
    ref,
    invite,
    emailRaw,
    emailNorm: emailRaw.toLowerCase(),
    now: isoNow(),
    password,
    displayFromForm: trimmed(displayName),
    displayFromInvite: trimmed(invite.inviteeDisplayName),
  };

  if (invite.role === 'super_admin') return acceptSuperAdminInvite(ctx);
  if (invite.role === 'teacher') return acceptTeacherInvite(ctx);
  if (invite.role === 'parent') return acceptParentInvite(ctx);
  if (invite.role !== 'principal') throw new functions.https.HttpsError('failed-precondition', 'Invite token role mismatch.');
  return acceptPrincipalInvite(ctx, displayName);
});
