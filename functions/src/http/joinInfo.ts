import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { json, readJsonBody, setCors } from '../lib/http';
import { QrMode } from '../lib/qr';
import { isIsoExpired, isoNow, randomToken, sha256Hex } from '../lib/util';

// Public: fetch branded school join info and record a scan.
export const joinSchoolInfo = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) return json(res, 400, { ok: false, error: 'missing_slug' });

  const db = admin.firestore();
  const slugSnap = await db.collection('schoolSlugs').doc(slug).get();
  const schoolId = slugSnap.exists ? (slugSnap.data() as { schoolId?: string }).schoolId : null;
  if (!schoolId) return json(res, 404, { ok: false, error: 'school_not_found' });

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) return json(res, 404, { ok: false, error: 'school_not_found' });
  const school = schoolSnap.data() as {
    name?: string;
    logoUrl?: string;
    principalName?: string;
    status?: string;
    subscriptionStatus?: string;
  };
  if (school.subscriptionStatus && school.subscriptionStatus !== 'active') {
    return json(res, 403, { ok: false, error: 'school_inactive' });
  }
  if (school.status && school.status !== 'ACTIVE') {
    return json(res, 403, { ok: false, error: 'school_inactive' });
  }

  const requestedQrId = typeof req.query.qr === 'string' ? req.query.qr.trim() : '';
  let qrDoc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot;
  if (requestedQrId) {
    const snap = await db.collection('schools').doc(schoolId).collection('qrCodes').doc(requestedQrId).get();
    if (!snap.exists) return json(res, 404, { ok: false, error: 'qr_not_found' });
    qrDoc = snap;
  } else {
    const qrSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('qrCodes')
      .where('isActive', '==', true)
      .where('classId', '==', null)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (qrSnap.empty) return json(res, 404, { ok: false, error: 'qr_not_found' });
    qrDoc = qrSnap.docs[0];
  }
  const qrId = qrDoc.id;
  const qr = qrDoc.data() as {
    isActive?: boolean;
    expiresAt?: string | null;
    maxRegistrations?: number | null;
    registrationCount?: number;
    scanCount?: number;
    mode?: QrMode;
    inviteUrl?: string;
    joinUrl?: string;
    classId?: string | null;
    prefillChildFirstName?: string;
    prefillChildSurname?: string;
  };
  if (qr.isActive === false) return json(res, 410, { ok: false, error: 'qr_inactive' });

  if (isIsoExpired(qr.expiresAt ?? null)) return json(res, 410, { ok: false, error: 'qr_expired' });
  if (typeof qr.maxRegistrations === 'number' && typeof qr.registrationCount === 'number' && qr.registrationCount >= qr.maxRegistrations) {
    return json(res, 410, { ok: false, error: 'qr_limit_reached' });
  }

  // Scan log
  const ip = (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0] : req.ip) || '';
  const ipSalt = process.env.IP_HASH_SALT || '';
  const ipHash = ip ? sha256Hex(`${ipSalt}:${ip}`) : null;
  const now = isoNow();
  await Promise.all([
    qrDoc.ref.collection('scanLogs').doc().set({
      qrCodeId: qrId,
      schoolId,
      scannedAt: now,
      ipHash,
      outcome: 'SCANNED',
    }),
    qrDoc.ref.update({ scanCount: (qr.scanCount ?? 0) + 1, updatedAt: now }),
    db.collection('analyticsEvents').doc().set({
      type: 'qr_scanned',
      createdAt: now,
      schoolId,
      qrCodeId: qrId,
      props: { slug, requestedQrId: requestedQrId || null },
    }),
  ]);

  return json(res, 200, {
    ok: true,
    schoolId,
    schoolSlug: slug,
    schoolName: school.name ?? 'My Little Moments',
    logoUrl: school.logoUrl ?? null,
    principalName: school.principalName ?? null,
    qrCodeId: qrId,
    qrMode: (qr.mode ?? 'WEB_FORM') as QrMode,
    inviteUrl: qr.inviteUrl ?? null,
    joinUrl: (qr as any).joinUrl ?? null,
    classId: qr.classId ?? null,
    prefillChildFirstName: qr.prefillChildFirstName ?? null,
    prefillChildSurname: qr.prefillChildSurname ?? null,
  });
});

// Public: create a short-lived join session token after scan.
export const createJoinSession = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  const { schoolSlug, qrCodeId } = body as { schoolSlug?: string; qrCodeId?: string };
  if (!schoolSlug || !qrCodeId) return json(res, 400, { ok: false, error: 'missing_fields' });
  const slug = String(schoolSlug).trim();
  const qid = String(qrCodeId).trim();
  const db = admin.firestore();
  const slugSnap = await db.collection('schoolSlugs').doc(slug).get();
  const schoolId = slugSnap.exists ? (slugSnap.data() as { schoolId?: string }).schoolId : null;
  if (!schoolId) return json(res, 404, { ok: false, error: 'school_not_found' });

  const qrRef = db.collection('schools').doc(schoolId).collection('qrCodes').doc(qid);
  const qrSnap = await qrRef.get();
  if (!qrSnap.exists) return json(res, 404, { ok: false, error: 'qr_not_found' });
  const qr = qrSnap.data() as { isActive?: boolean; expiresAt?: string | null; maxRegistrations?: number | null; registrationCount?: number };
  if (qr.isActive === false) return json(res, 410, { ok: false, error: 'qr_inactive' });
  if (isIsoExpired(qr.expiresAt ?? null)) return json(res, 410, { ok: false, error: 'qr_expired' });
  if (typeof qr.maxRegistrations === 'number' && typeof qr.registrationCount === 'number' && qr.registrationCount >= qr.maxRegistrations) {
    return json(res, 410, { ok: false, error: 'qr_limit_reached' });
  }

  const now = isoNow();
  const sessionId = randomToken(24);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.collection('joinSessions').doc(sessionId).set({
    id: sessionId,
    schoolId,
    schoolSlug: slug,
    qrCodeId: qid,
    expiresAt,
    createdAt: now,
  });
  await db.collection('analyticsEvents').doc().set({
    type: 'join_session_created',
    createdAt: now,
    schoolId,
    qrCodeId: qid,
    joinSessionId: sessionId,
  });
  return json(res, 200, { ok: true, sessionToken: sessionId, expiresAt });
});
