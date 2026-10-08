import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sharp = require('sharp');
import { json, readJsonBody, setCors } from '../lib/http';
import { isIsoExpired, isoNow } from '../lib/util';

// Public: list classes for registration dropdown.
export const joinSchoolClasses = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) return json(res, 400, { ok: false, error: 'missing_slug' });
  const db = admin.firestore();
  const slugSnap = await db.collection('schoolSlugs').doc(slug).get();
  const schoolId = slugSnap.exists ? (slugSnap.data() as { schoolId?: string }).schoolId : null;
  if (!schoolId) return json(res, 404, { ok: false, error: 'school_not_found' });

  const classesSnap = await db.collection('schools').doc(schoolId).collection('classes').get();
  const classes = classesSnap.docs.map((d) => {
    const c = d.data() as { name?: string; minAgeMonths?: number | null; maxAgeMonths?: number | null };
    return {
      id: d.id,
      name: c.name ?? 'Class',
      minAgeMonths: c.minAgeMonths ?? null,
      maxAgeMonths: c.maxAgeMonths ?? null,
    };
  });
  return json(res, 200, { ok: true, schoolId, classes });
});

// Public: upload an optional child photo during onboarding (base64 payload).
export const uploadChildPhoto = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  const { sessionToken, mimeType, base64Data } = body as { sessionToken?: string; mimeType?: string; base64Data?: string };
  if (!sessionToken || !base64Data) return json(res, 400, { ok: false, error: 'missing_fields' });
  const mt = typeof mimeType === 'string' ? mimeType : 'image/jpeg';
  if (!/^image\/(jpeg|png|webp)$/.test(mt)) return json(res, 400, { ok: false, error: 'unsupported_type' });
  const raw = String(base64Data).replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length > 1024 * 1024) return json(res, 413, { ok: false, error: 'too_large' });

  const db = admin.firestore();
  const sessionRef = db.collection('joinSessions').doc(String(sessionToken).trim());
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return json(res, 404, { ok: false, error: 'session_not_found' });
  const session = sessionSnap.data() as { schoolId: string; expiresAt: string };
  if (isIsoExpired(session.expiresAt)) return json(res, 410, { ok: false, error: 'session_expired' });

  const resized = await sharp(buf).resize(600, 600, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
  const schoolId = session.schoolId;
  const path = `schools/${schoolId}/onboarding/childPhotos/${sessionRef.id}.jpg`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(path);
  await file.save(resized, { contentType: 'image/jpeg', resumable: false, metadata: { cacheControl: 'public, max-age=31536000, immutable' } });
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5 });
  return json(res, 200, { ok: true, photoUrl: url });
});

// Public: lightweight analytics tracking (step completion, abandonment, first photo viewed).
export const trackAnalyticsEvent = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  let body: any;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  const { type, schoolId, qrCodeId, joinSessionId, step, props } = body as {
    type?: string;
    schoolId?: string;
    qrCodeId?: string;
    joinSessionId?: string;
    step?: number;
    props?: Record<string, unknown>;
  };
  const allowed = new Set([
    'registration_step_completed',
    'registration_abandoned',
    'first_photo_viewed',
  ]);
  if (!type || typeof type !== 'string' || !allowed.has(type)) {
    return json(res, 400, { ok: false, error: 'invalid_type' });
  }
  const now = isoNow();
  await admin.firestore().collection('analyticsEvents').doc().set({
    type,
    createdAt: now,
    ...(schoolId ? { schoolId: String(schoolId) } : {}),
    ...(qrCodeId ? { qrCodeId: String(qrCodeId) } : {}),
    ...(joinSessionId ? { joinSessionId: String(joinSessionId) } : {}),
    ...(typeof step === 'number' ? { step } : {}),
    ...(props && typeof props === 'object' ? { props } : {}),
  });
  return json(res, 200, { ok: true });
});
