import * as functions from 'firebase-functions';
import { inviteEmailHeadlineFirstName } from '../email/layout';
import { sendTeacherPostAcceptWelcomeEmail } from '../email/welcome';
import { RoleProfileSlice, assertStaffSchoolConflict, roleMergePayload } from '../roles';
import { AcceptContext, checkExistingAccount, logEmailFailure, resolveInviteAuth, trimmed } from './context';

export async function acceptTeacherInvite(ctx: AcceptContext) {
  const { db, invite, now } = ctx;
  const schoolId = invite.schoolId?.trim();
  if (!schoolId) throw new functions.https.HttpsError('invalid-argument', 'Invite is missing school information.');
  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const preferred = trimmed(invite.inviteePreferredName);

  const accountExists = await checkExistingAccount(ctx.emailNorm, async (uid) => {
    const profSnap = await db.collection('users').doc(uid).get();
    if (profSnap.exists) assertStaffSchoolConflict(profSnap.data() as RoleProfileSlice, 'teacher', schoolId);
  });
  const resolved = await resolveInviteAuth(ctx, accountExists);
  const userRef = db.collection('users').doc(resolved.uid);
  const priorSnap = await userRef.get();
  const prior = priorSnap.exists ? (priorSnap.data() as RoleProfileSlice & { displayName?: string }) : null;
  const displayName = ctx.displayFromForm ?? ctx.displayFromInvite ?? prior?.displayName ?? resolved.displayName;
  await userRef.set(
    {
      email: ctx.emailNorm,
      displayName,
      ...(preferred ? { preferredName: preferred } : {}),
      ...roleMergePayload(prior, 'teacher', { setActive: true, schoolId }),
      isActive: true,
      updatedAt: now,
      ...(priorSnap.exists ? {} : { createdAt: now }),
    },
    { merge: true }
  );
  await ctx.ref.update({ usedAt: now });

  const schoolName = trimmed(invite.schoolName) || trimmed((schoolSnap.data() as { name?: string }).name) || 'your school';
  void sendTeacherPostAcceptWelcomeEmail({
    to: ctx.emailRaw,
    firstName: inviteEmailHeadlineFirstName({
      preferred,
      displayFromForm: ctx.displayFromForm,
      displayFromInvite: ctx.displayFromInvite,
      fallbackDisplay: displayName,
    }),
    schoolName,
    className: trimmed(invite.className) || 'your assigned class',
  }).catch(logEmailFailure('sendTeacherPostAcceptWelcomeEmail'));

  return { ok: true as const, teacherUid: resolved.uid, existingAccount: resolved.existed };
}
