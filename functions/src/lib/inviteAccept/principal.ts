import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RoleProfileSlice, assertStaffSchoolConflict, roleMergePayload, userHasRole } from '../roles';
import { reserveUniqueSchoolSlug } from '../util';
import { AcceptContext, checkExistingAccount, resolveInviteAuth, trimmed } from './context';

async function createSchoolForInvite(ctx: AcceptContext, principalUid: string, principalName: string | null): Promise<string> {
  const { db, invite, now } = ctx;
  const schoolRef = db.collection('schools').doc();
  const slug = await reserveUniqueSchoolSlug(db, invite.schoolName || 'school');
  await db.collection('schoolSlugs').doc(slug).set({ slug, schoolId: schoolRef.id, createdAt: now }, { merge: true });
  const logoUrl = trimmed(invite.logoUrl);
  await schoolRef.set({
    name: trimmed(invite.schoolName) ?? 'New School',
    slug,
    status: 'ACTIVE',
    principalEmail: ctx.emailNorm,
    ...(principalName ? { principalName } : {}),
    subscriptionStatus: 'active',
    principalUid,
    principalUids: [principalUid],
    createdAt: now,
    updatedAt: now,
    ...(logoUrl ? { logoUrl } : {}),
  });
  return schoolRef.id;
}

// Additional principals join an existing school; the first principal stays primary.
async function joinExistingSchool(ctx: AcceptContext, schoolId: string, principalUid: string, principalName: string | null) {
  const schoolRef = ctx.db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found for this invite.');
  const row = schoolSnap.data() as { principalUid?: string; principalName?: string; principalEmail?: string };
  await schoolRef.update({
    status: 'ACTIVE',
    updatedAt: ctx.now,
    principalUids: admin.firestore.FieldValue.arrayUnion(principalUid),
    ...(!row.principalUid ? { principalUid } : {}),
    ...(!row.principalEmail ? { principalEmail: ctx.emailNorm } : {}),
    ...(!row.principalName && principalName ? { principalName } : {}),
  });
}

export async function acceptPrincipalInvite(ctx: AcceptContext, formDisplayName: unknown) {
  const { db, invite, now } = ctx;
  const accountExists = await checkExistingAccount(ctx.emailNorm, async (uid) => {
    const snap = await db.collection('users').doc(uid).get();
    const prior = snap.exists ? (snap.data() as RoleProfileSlice) : null;
    const targetSchoolId = invite.createdSchoolId || invite.schoolId;
    if (prior && targetSchoolId && !(userHasRole(prior, 'principal') && prior.schoolId === targetSchoolId)) {
      assertStaffSchoolConflict(prior, 'principal', targetSchoolId);
    }
  });
  const resolved = await resolveInviteAuth(ctx, accountExists, trimmed(invite.principalName) || ctx.displayFromInvite);
  const principalUid = resolved.uid;
  const principalName = trimmed(formDisplayName) ?? trimmed(invite.principalName);

  let schoolId = invite.createdSchoolId || invite.schoolId;
  if (!schoolId) schoolId = await createSchoolForInvite(ctx, principalUid, principalName);
  else await joinExistingSchool(ctx, schoolId, principalUid, principalName);

  const userRef = db.collection('users').doc(principalUid);
  const priorSnap = await userRef.get();
  const prior = priorSnap.exists ? (priorSnap.data() as RoleProfileSlice & { displayName?: string }) : null;
  if (prior) {
    // A partially completed earlier accept already made them principal here; finish it.
    if (userHasRole(prior, 'principal') && prior.schoolId === schoolId) {
      await ctx.ref.update({ usedAt: now, createdSchoolId: schoolId });
      const customToken = await admin.auth().createCustomToken(principalUid);
      return { ok: true as const, principalUid, schoolId, customToken, existingAccount: true };
    }
    assertStaffSchoolConflict(prior, 'principal', schoolId);
  }
  await userRef.set(
    {
      email: ctx.emailNorm,
      displayName: ctx.displayFromForm || prior?.displayName || resolved.displayName,
      ...roleMergePayload(prior, 'principal', { setActive: true, schoolId }),
      isActive: true,
      ...(priorSnap.exists ? {} : { createdAt: now }),
      updatedAt: now,
    },
    { merge: true }
  );
  await ctx.ref.update({ usedAt: now, createdSchoolId: schoolId });
  const customToken = await admin.auth().createCustomToken(principalUid);
  return { ok: true as const, principalUid, schoolId, customToken, existingAccount: resolved.existed };
}
