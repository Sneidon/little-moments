import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TRANSACTIONAL_EMAIL_UI_FONT, escapeHtml, transactionalEmailLogoTop } from '../lib/email/layout';
import { sendResendEmail } from '../lib/email/send';
import { json, readJsonBody, setCors } from '../lib/http';
import { isIsoExpired, isValidEmail, isoNow, normalizeSaMobile, randomToken } from '../lib/util';

// Public: register parent + child via QR (creates pending approval).
export const registerParentViaQr = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  const {
    sessionToken,
    parentName,
    parentEmail,
    parentMobile,
    whatsappOptIn,
    childFirstName,
    childSurname,
    dob,
    classId,
    popiaConsent,
    childPhotoUrl,
  } = body as Record<string, any>;

  if (!sessionToken || typeof sessionToken !== 'string') return json(res, 400, { ok: false, error: 'missing_session' });
  const email = typeof parentEmail === 'string' ? parentEmail.trim().toLowerCase() : '';
  const name = typeof parentName === 'string' ? parentName.trim() : '';
  const mobileNorm = typeof parentMobile === 'string' ? normalizeSaMobile(parentMobile) : null;
  if (!name) return json(res, 400, { ok: false, error: 'missing_parent_name' });
  if (!email || !isValidEmail(email)) return json(res, 400, { ok: false, error: 'invalid_email' });
  if (!mobileNorm) return json(res, 400, { ok: false, error: 'invalid_mobile' });
  if (!childFirstName || !childSurname || !dob || !classId) return json(res, 400, { ok: false, error: 'missing_child_fields' });
  if (popiaConsent !== true) return json(res, 400, { ok: false, error: 'popia_required' });

  const db = admin.firestore();
  const sessionRef = db.collection('joinSessions').doc(String(sessionToken).trim());
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return json(res, 404, { ok: false, error: 'session_not_found' });
  const session = sessionSnap.data() as { schoolId: string; schoolSlug: string; qrCodeId: string; expiresAt: string; usedAt?: string };
  if (session.usedAt) return json(res, 409, { ok: false, error: 'session_used' });
  if (isIsoExpired(session.expiresAt)) return json(res, 410, { ok: false, error: 'session_expired' });

  const schoolId = session.schoolId;
  const qrRef = db.collection('schools').doc(schoolId).collection('qrCodes').doc(session.qrCodeId);
  const qrSnap = await qrRef.get();
  if (!qrSnap.exists) return json(res, 404, { ok: false, error: 'qr_not_found' });
  const qr = qrSnap.data() as { isActive?: boolean; expiresAt?: string | null; maxRegistrations?: number | null; registrationCount?: number; scanCount?: number };
  if (qr.isActive === false) return json(res, 410, { ok: false, error: 'qr_inactive' });
  if (isIsoExpired(qr.expiresAt ?? null)) return json(res, 410, { ok: false, error: 'qr_expired' });
  if (typeof qr.maxRegistrations === 'number' && typeof qr.registrationCount === 'number' && qr.registrationCount >= qr.maxRegistrations) {
    return json(res, 410, { ok: false, error: 'qr_limit_reached' });
  }

  // Validate class exists
  const classRef = db.collection('schools').doc(schoolId).collection('classes').doc(String(classId));
  const classSnap = await classRef.get();
  if (!classSnap.exists) return json(res, 400, { ok: false, error: 'invalid_class' });
  const classData = classSnap.data() as { assignedTeacherId?: string; name?: string };
  const teacherId = classData.assignedTeacherId || null;

  // Create/reuse Auth user for parent (passwordless registration => temp password).
  let parentUid: string;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    parentUid = existing.uid;
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code !== 'auth/user-not-found') {
      functions.logger.error('registerParentViaQr: auth lookup failed', err);
      return json(res, 500, { ok: false, error: 'auth_error' });
    }
    const tmpPassword = randomToken(18);
    const userRecord = await admin.auth().createUser({
      email,
      password: tmpPassword,
      displayName: name,
    });
    parentUid = userRecord.uid;
  }

  const now = isoNow();
  const childName = `${String(childFirstName).trim()} ${String(childSurname).trim()}`.trim();
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc();
  const childIdCreated = childRef.id;
  const regRef = db.collection('schools').doc(schoolId).collection('pendingRegistrations').doc();
  const regId = regRef.id;

  const batch = db.batch();
  batch.set(
    db.collection('users').doc(parentUid),
    {
      email,
      displayName: name,
      phone: mobileNorm,
      whatsappOptIn: Boolean(whatsappOptIn),
      role: 'parent',
      roles: ['parent'],
      schoolId,
      parentStatus: 'PENDING_APPROVAL',
      isActive: true,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
  batch.set(childRef, {
    schoolId,
    name: childName || 'Child',
    dateOfBirth: String(dob),
    classId: String(classId),
    assignedTeacherId: teacherId || undefined,
    parentIds: [parentUid],
    photoURL: typeof childPhotoUrl === 'string' && childPhotoUrl.trim() ? childPhotoUrl.trim() : undefined,
    popiaConsent: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(regRef, {
    id: regId,
    schoolId,
    classId: String(classId),
    teacherId,
    parentUid,
    childId: childIdCreated,
    qrCodeId: session.qrCodeId,
    status: 'PENDING',
    createdAt: now,
  });
  batch.update(qrRef, {
    registrationCount: (qr.registrationCount ?? 0) + 1,
    updatedAt: now,
  });
  batch.update(sessionRef, { usedAt: now });
  batch.set(qrRef.collection('scanLogs').doc(), {
    qrCodeId: session.qrCodeId,
    schoolId,
    scannedAt: now,
    outcome: 'REGISTERED',
    ipHash: null,
  });
  batch.set(db.collection('analyticsEvents').doc(), {
    type: 'registration_completed',
    createdAt: now,
    schoolId,
    qrCodeId: session.qrCodeId,
    joinSessionId: sessionRef.id,
    registrationId: regId,
    userId: parentUid,
    props: { className: classData.name || null },
  });
  await batch.commit();

  if (teacherId) {
    await db
      .collection('users')
      .doc(teacherId)
      .collection('notifications')
      .doc()
      .set({
        title: 'New registration',
        body: `${name} → ${childName} (${classData.name || 'Class'})`,
        createdAt: now,
        read: false,
        type: 'pending_registration',
        schoolId,
        registrationId: regId,
        parentUid,
        childId: childIdCreated,
        classId: String(classId),
      });
  }

  // Parent welcome email (review pending)
  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = schoolSnap.exists ? (schoolSnap.data() as { name?: string }).name || 'My Little Moments' : 'My Little Moments';
  await sendResendEmail({
    to: email,
    subject: `Welcome to My Little Moments — ${schoolName}`,
    html: `<div style="font-family:${TRANSACTIONAL_EMAIL_UI_FONT};line-height:1.5;color:#0f172a"><div style="max-width:560px;margin:0 auto;padding:24px">${transactionalEmailLogoTop()}<h1 style="margin:0 0 12px;font-size:22px">Welcome, ${escapeHtml(name)}!</h1><p style="margin:0 0 16px">We received your registration for <strong>${escapeHtml(childName)}</strong> at <strong>${escapeHtml(schoolName)}</strong>.</p><p style="margin:0 0 16px">Your registration is being reviewed by the class teacher. We&apos;ll email you as soon as you&apos;re approved.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" /><p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p></div></div>`,
  });
  let teacherName: string | null = null;
  if (teacherId) {
    const tSnap = await db.collection('users').doc(teacherId).get();
    if (tSnap.exists) {
      teacherName = (tSnap.data() as { displayName?: string; preferredName?: string }).preferredName
        ? String((tSnap.data() as any).preferredName)
        : (tSnap.data() as any).displayName
          ? String((tSnap.data() as any).displayName)
          : null;
    }
  }

  return json(res, 200, { ok: true, registrationId: regId, childId: childIdCreated, teacherId, teacherName, className: classData.name || null });
});
