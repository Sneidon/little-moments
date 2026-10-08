import * as functions from 'firebase-functions';
import { MAX_PARENTS_PER_CHILD } from '../config';
import { inviteEmailHeadlineFirstName } from '../email/layout';
import { sendParentPostAcceptWelcomeEmail } from '../email/welcome';
import { RoleProfileSlice, normalizeUserRoles, roleMergePayload } from '../roles';
import { AcceptContext, checkExistingAccount, logEmailFailure, resolveInviteAuth, trimmed } from './context';

async function schoolNameFor(ctx: AcceptContext, schoolId: string): Promise<string> {
  const fromInvite = trimmed(ctx.invite.schoolName);
  if (fromInvite) return fromInvite;
  const snap = await ctx.db.collection('schools').doc(schoolId).get();
  return (snap.exists && trimmed((snap.data() as { name?: string }).name)) || 'your school';
}

export async function acceptParentInvite(ctx: AcceptContext) {
  const { db, invite, now } = ctx;
  const schoolId = invite.schoolId?.trim();
  const childId = invite.childId?.trim();
  if (!schoolId || !childId) throw new functions.https.HttpsError('invalid-argument', 'Invite is missing school or child information.');

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
  const parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError('failed-precondition', `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`);
  }
  const preferred = trimmed(invite.inviteePreferredName);
  const phone = trimmed(invite.inviteePhone) ?? undefined;

  const accountExists = await checkExistingAccount(ctx.emailNorm, (uid) => {
    if (parentIds.includes(uid)) throw new functions.https.HttpsError('failed-precondition', 'You are already linked to this child.');
  });
  const resolved = await resolveInviteAuth(ctx, accountExists);
  const parentUid = resolved.uid;
  const userRef = db.collection('users').doc(parentUid);
  const userSnap = await userRef.get();
  const prior = userSnap.exists ? (userSnap.data() as RoleProfileSlice & { displayName?: string }) : null;
  const displayName = ctx.displayFromForm ?? ctx.displayFromInvite ?? prior?.displayName ?? resolved.displayName;
  const updates: Record<string, unknown> = {
    email: ctx.emailNorm,
    displayName,
    ...roleMergePayload(prior, 'parent', {
      setActive: !prior || !normalizeUserRoles(prior).role,
      schoolId: (prior?.schoolId as string | undefined) || schoolId,
    }),
    isActive: true,
    updatedAt: now,
  };
  if (phone !== undefined) updates.phone = phone;
  if (preferred) updates.preferredName = preferred;
  if (userSnap.exists) await userRef.update(updates);
  else await userRef.set({ ...updates, createdAt: now });
  if (!parentIds.includes(parentUid)) await childRef.update({ parentIds: [...parentIds, parentUid], updatedAt: now });
  await ctx.ref.update({ usedAt: now });

  void sendParentPostAcceptWelcomeEmail({
    to: ctx.emailRaw,
    firstName: inviteEmailHeadlineFirstName({
      preferred,
      displayFromForm: ctx.displayFromForm,
      displayFromInvite: ctx.displayFromInvite,
      fallbackDisplay: displayName,
    }),
    schoolName: await schoolNameFor(ctx, schoolId),
    childName: trimmed(invite.childName) || trimmed((childSnap.data() as { name?: string }).name) || 'your child',
  }).catch(logEmailFailure('sendParentPostAcceptWelcomeEmail'));

  return { ok: true as const, parentUid, existingAccount: resolved.existed };
}
