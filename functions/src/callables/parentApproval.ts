import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireCallerProfile } from '../lib/auth';
import { TRANSACTIONAL_EMAIL_UI_FONT, escapeHtml, inviteEmailEscapeHref, transactionalEmailLogoTop } from '../lib/email/layout';
import { sendResendEmail } from '../lib/email/send';
import { userHasRole } from '../lib/roles';
import { isoNow } from '../lib/util';

function parentApprovedEmailHtml(params: { parentName: string; schoolName: string; resetUrl: string }): string {
  return `
  <div style="font-family:${TRANSACTIONAL_EMAIL_UI_FONT};line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      ${transactionalEmailLogoTop()}
      <h1 style="margin:0 0 12px;font-size:22px">You&apos;re approved! See your child&apos;s first moments</h1>
      <p style="margin:0 0 16px">Hi ${escapeHtml(params.parentName)},</p>
      <p style="margin:0 0 16px">Good news — your account for <strong>${escapeHtml(params.schoolName)}</strong> has been approved.</p>
      <p style="margin:24px 0">
        <a href="${inviteEmailEscapeHref(params.resetUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700">
          Set your password &amp; sign in
        </a>
      </p>
      <p style="margin:0 0 16px;color:#475569;font-size:13px">Tip: once signed in, you&apos;ll immediately see the latest class moments.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p>
    </div>
  </div>
  `;
}

function parentRejectedEmailHtml(params: { parentName: string; schoolName: string; reason?: string | null }): string {
  return `
  <div style="font-family:${TRANSACTIONAL_EMAIL_UI_FONT};line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      ${transactionalEmailLogoTop()}
      <h1 style="margin:0 0 12px;font-size:22px">Update on your registration</h1>
      <p style="margin:0 0 16px">Hi ${escapeHtml(params.parentName)},</p>
      <p style="margin:0 0 16px">Your registration for <strong>${escapeHtml(params.schoolName)}</strong> was not approved.</p>
      ${params.reason ? `<p style="margin:0 0 16px;color:#475569"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ''}
      <p style="margin:0 0 16px">If you believe this is a mistake, please contact your school directly.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p>
    </div>
  </div>
  `;
}

// Teacher trust layer: approve/reject parent registrations.
export const approveOrRejectParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, uid);
  if (!userHasRole(caller, 'teacher') || !caller.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers can approve registrations.');
  }
  const schoolId = caller.schoolId;
  const { registrationId, approved, reason } = data as { registrationId?: string; approved?: boolean; reason?: string };
  if (!registrationId || typeof registrationId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'registrationId is required.');
  }
  const regRef = db.collection('schools').doc(schoolId).collection('pendingRegistrations').doc(registrationId);
  const regSnap = await regRef.get();
  if (!regSnap.exists) throw new functions.https.HttpsError('not-found', 'Registration not found.');
  const reg = regSnap.data() as {
    teacherId?: string | null;
    parentUid: string;
    childId: string;
    classId: string;
    status?: string;
  };
  if (reg.teacherId && reg.teacherId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this registration.');
  }
  if (reg.status && reg.status !== 'PENDING') {
    throw new functions.https.HttpsError('failed-precondition', 'Registration already decided.');
  }

  // Ensure teacher is assigned to the class (defense in depth).
  const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(reg.classId).get();
  const assignedTeacherId = classSnap.exists ? (classSnap.data() as { assignedTeacherId?: string }).assignedTeacherId : null;
  if (assignedTeacherId && assignedTeacherId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You are not the assigned teacher for this class.');
  }

  const now = isoNow();
  const parentRef = db.collection('users').doc(reg.parentUid);
  const parentSnap = await parentRef.get();
  const parentProfile = parentSnap.exists ? (parentSnap.data() as { displayName?: string; email?: string }) : null;
  const parentEmail = parentProfile?.email ? String(parentProfile.email) : null;
  const parentName = parentProfile?.displayName ? String(parentProfile.displayName) : 'Parent';
  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = schoolSnap.exists ? (schoolSnap.data() as { name?: string }).name || 'My Little Moments' : 'My Little Moments';

  if (approved === true) {
    const batch = db.batch();
    batch.update(regRef, { status: 'APPROVED', decidedAt: now, decidedBy: uid });
    batch.set(parentRef, { parentStatus: 'ACTIVE', updatedAt: now }, { merge: true });
    // Ensure parentId is linked to child (idempotent).
    const childRef = db.collection('schools').doc(schoolId).collection('children').doc(reg.childId);
    const childSnap = await childRef.get();
    if (childSnap.exists) {
      const child = childSnap.data() as { parentIds?: string[] };
      const parentIds = Array.isArray(child.parentIds) ? child.parentIds : [];
      if (!parentIds.includes(reg.parentUid)) {
        batch.update(childRef, { parentIds: [...parentIds, reg.parentUid], updatedAt: now });
      }
    }
    batch.set(db.collection('analyticsEvents').doc(), {
      type: 'registration_approved',
      createdAt: now,
      schoolId,
      registrationId,
      userId: reg.parentUid,
      props: { teacherId: uid },
    } as any);
    await batch.commit();

    if (parentEmail) {
      const continueUrl = process.env.PUBLIC_APP_URL || 'https://app.mylittlemoments.co.za';
      const resetUrl = await admin.auth().generatePasswordResetLink(parentEmail, { url: `${continueUrl}` });
      await sendResendEmail({
        to: parentEmail,
        subject: `You're approved! See your child's first moments`,
        html: parentApprovedEmailHtml({ parentName, schoolName, resetUrl }),
      });
    }
    return { ok: true };
  }

  const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : null;
  await regRef.update({ status: 'REJECTED', decidedAt: now, decidedBy: uid, rejectionReason });
  await parentRef.set({ parentStatus: 'REJECTED', updatedAt: now }, { merge: true });
  if (parentEmail) {
    await sendResendEmail({
      to: parentEmail,
      subject: `Update on your registration`,
      html: parentRejectedEmailHtml({ parentName, schoolName, reason: rejectionReason }),
    });
  }
  return { ok: true };
});
