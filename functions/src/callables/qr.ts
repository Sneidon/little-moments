import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireCallerProfile, requireRoleAllowed } from '../lib/auth';
import { QrMode, QrSource, createQrCodeInternal } from '../lib/qr';
import { userHasRole } from '../lib/roles';
import { isoNow } from '../lib/util';

// Create or update a QR code for a school (and optionally a class).
export const createOrUpdateQrCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, uid);

  const { schoolId, classId, expiresAt, maxRegistrations, source, mode } = data as {
    schoolId?: string;
    classId?: string | null;
    expiresAt?: string | null;
    maxRegistrations?: number | null;
    source?: QrSource;
    mode?: QrMode;
  };
  if (!schoolId || typeof schoolId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  requireRoleAllowed(caller, ['principal', 'teacher'], { schoolId, message: 'Only staff can manage QR codes.' });
  const qrMode: QrMode = mode === 'WHATSAPP_DEEP_LINK' ? 'WHATSAPP_DEEP_LINK' : 'WEB_FORM';
  const src: QrSource = source && ['POSTER', 'WHATSAPP', 'EMAIL', 'OPEN_DAY'].includes(source) ? source : 'POSTER';
  const result = await createQrCodeInternal({
    db,
    schoolId,
    createdByUid: uid,
    classId: classId && typeof classId === 'string' ? classId : null,
    expiresAt: expiresAt && typeof expiresAt === 'string' ? expiresAt : null,
    maxRegistrations: typeof maxRegistrations === 'number' ? Math.max(0, Math.floor(maxRegistrations)) : null,
    source: src,
    mode: qrMode,
  });
  return { ok: true, ...result };
});

// Rotating QR codes: invalidate an old one and issue a new one.
export const regenerateQrCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, uid);

  const { schoolId, qrCodeId } = data as { schoolId?: string; qrCodeId?: string };
  if (!schoolId || !qrCodeId || typeof schoolId !== 'string' || typeof qrCodeId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId and qrCodeId are required.');
  }
  requireRoleAllowed(caller, ['principal', 'teacher'], { schoolId, message: 'Only staff can rotate QR codes.' });

  const oldRef = db.collection('schools').doc(schoolId).collection('qrCodes').doc(qrCodeId);
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) throw new functions.https.HttpsError('not-found', 'QR code not found.');
  const old = oldSnap.data() as { classId?: string | null; expiresAt?: string | null; maxRegistrations?: number | null; source?: QrSource; mode?: QrMode };
  await oldRef.update({ isActive: false, updatedAt: isoNow() });
  const result = await createQrCodeInternal({
    db,
    schoolId,
    createdByUid: uid,
    classId: old.classId ?? null,
    expiresAt: old.expiresAt ?? null,
    maxRegistrations: typeof old.maxRegistrations === 'number' ? old.maxRegistrations : null,
    source: old.source ?? 'POSTER',
    mode: old.mode === 'WHATSAPP_DEEP_LINK' ? 'WHATSAPP_DEEP_LINK' : 'WEB_FORM',
  });
  return { ok: true, ...result };
});

// Premium: upload roster CSV and generate personalised per-child QR codes.
export const generatePersonalisedQrsFromCsv = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, uid);
  if (!userHasRole(caller, 'principal') || !caller.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can generate personalised QRs.');
  }
  const schoolId = caller.schoolId;
  const { csvText } = data as { csvText?: string };
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'csvText is required.');
  }

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const school = schoolSnap.exists ? (schoolSnap.data() as { features?: any; subscriptionStatus?: string }) : null;
  const enabled = Boolean(school?.features?.personalisedQr);
  if (!enabled) {
    throw new functions.https.HttpsError('failed-precondition', 'Personalised QR is a premium feature for this school.');
  }
  if (school?.subscriptionStatus && school.subscriptionStatus !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Subscription is not active.');
  }

  const classesSnap = await db.collection('schools').doc(schoolId).collection('classes').get();
  const classByName = new Map<string, string>();
  classesSnap.docs.forEach((d) => {
    const n = (d.data() as { name?: string }).name?.trim().toLowerCase();
    if (n) classByName.set(n, d.id);
  });

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new functions.https.HttpsError('invalid-argument', 'CSV must include a header row and at least one data row.');
  }
  const header = lines[0].split(',').map((h) => h.trim());
  const idxFirst = header.findIndex((h) => h === 'childFirstName');
  const idxSur = header.findIndex((h) => h === 'childSurname');
  const idxClass = header.findIndex((h) => h === 'class');
  if (idxFirst < 0 || idxSur < 0 || idxClass < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'CSV headers must include childFirstName, childSurname, class');
  }

  const created: Array<{ qrCodeId: string; childFirstName: string; childSurname: string; classId: string }> = [];
  for (const line of lines.slice(1).slice(0, 200)) {
    const cols = line.split(',').map((c) => c.trim());
    const firstName = (cols[idxFirst] || '').trim();
    const surname = (cols[idxSur] || '').trim();
    const className = (cols[idxClass] || '').trim().toLowerCase();
    if (!firstName || !surname || !className) continue;
    const classId = classByName.get(className);
    if (!classId) continue;
    const result = await createQrCodeInternal({
      db,
      schoolId,
      createdByUid: uid,
      classId,
      expiresAt: null,
      maxRegistrations: null,
      source: 'OPEN_DAY',
      mode: 'WEB_FORM',
    });
    await db.collection('schools').doc(schoolId).collection('qrCodes').doc(result.qrCodeId).set(
      {
        childId: null,
        prefillChildFirstName: firstName,
        prefillChildSurname: surname,
      },
      { merge: true }
    );
    created.push({ qrCodeId: result.qrCodeId, childFirstName: firstName, childSurname: surname, classId });
  }

  return { ok: true, createdCount: created.length, created };
});
