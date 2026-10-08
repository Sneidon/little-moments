import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, roleMergePayload, userHasRole } from '../roles';
import { AcceptContext, checkExistingAccount, resolveInviteAuth } from './context';

export async function acceptSuperAdminInvite(ctx: AcceptContext) {
  const { db, now } = ctx;
  const accountExists = await checkExistingAccount(ctx.emailNorm, async (uid) => {
    const profSnap = await db.collection('users').doc(uid).get();
    if (profSnap.exists && userHasRole(profSnap.data() as RoleProfileSlice, 'super_admin')) {
      throw new functions.https.HttpsError('failed-precondition', 'This account is already a super administrator.');
    }
  });
  const resolved = await resolveInviteAuth(ctx, accountExists);
  const userRef = db.collection('users').doc(resolved.uid);
  const priorSnap = await userRef.get();
  const prior = priorSnap.exists ? (priorSnap.data() as RoleProfileSlice) : null;
  const displayName =
    ctx.displayFromForm ?? ctx.displayFromInvite ?? (typeof prior?.displayName === 'string' ? prior.displayName : null) ?? resolved.displayName;
  await userRef.set(
    {
      email: ctx.emailNorm,
      displayName,
      ...roleMergePayload(prior, 'super_admin', { setActive: true }),
      isActive: true,
      updatedAt: now,
      ...(priorSnap.exists ? {} : { createdAt: now }),
    },
    { merge: true }
  );
  await ctx.ref.update({ usedAt: now });
  const customToken = await admin.auth().createCustomToken(resolved.uid);
  return { ok: true as const, superAdminUid: resolved.uid, customToken, existingAccount: resolved.existed };
}
