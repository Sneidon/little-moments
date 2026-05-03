/**
 * My Little Moments - Firebase Cloud Functions
 * Per proposal: notifications (FCM + SendGrid), event reminders, media validation.
 * Custom claims for role-based access (role, schoolId) set when user profile is created/updated.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import QRCode = require('qrcode');
import sharp = require('sharp');

admin.initializeApp();

// Direct fallback credentials (requested) when runtime config/env is absent.
const RESEND_API_KEY_FALLBACK = 're_S3xMBH7d_3YqMBTndWbkQxihUwyaL6sj1';
const RESEND_FROM_FALLBACK = 'noreply@mylittlemoments.co.za';

function isoNow(): string {
  return new Date().toISOString();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function slugifySchoolName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50);
}

function randomToken(bytes = 24): string {
  // base64url without padding
  return crypto.randomBytes(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function reserveUniqueSchoolSlug(db: admin.firestore.Firestore, schoolName: string): Promise<string> {
  const base = slugifySchoolName(schoolName) || 'school';
  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? '' : `-${Math.floor(Math.random() * 9000 + 1000)}`;
    const slug = `${base}${suffix}`;
    const slugRef = db.collection('schoolSlugs').doc(slug);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(slugRef);
        if (snap.exists) throw new Error('slug_taken');
        tx.set(slugRef, { slug, createdAt: isoNow() });
      });
      return slug;
    } catch (e) {
      if (e instanceof Error && e.message === 'slug_taken') continue;
    }
  }
  // last resort tokenized slug
  const slug = `${base}-${randomToken(6)}`;
  await db.collection('schoolSlugs').doc(slug).set({ slug, createdAt: isoNow() });
  return slug;
}

async function sendResendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = RESEND_API_KEY_FALLBACK;
  const from = RESEND_FROM_FALLBACK;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    functions.logger.error('Resend send failed', res.status, text);
    return;
  }
  functions.logger.info('Resend email sent', { to: params.to, subject: params.subject.slice(0, 120) });
}

async function requireCallerProfile(db: admin.firestore.Firestore, uid: string): Promise<{ role?: string; schoolId?: string; displayName?: string }> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return {};
  return snap.data() as { role?: string; schoolId?: string; displayName?: string };
}

function requireRoleAllowed(
  caller: { role?: string; schoolId?: string },
  allowed: Array<'super_admin' | 'principal' | 'teacher' | 'parent'>,
  opts?: { schoolId?: string; message?: string }
): void {
  if (!caller.role || !allowed.includes(caller.role as any)) {
    throw new functions.https.HttpsError('permission-denied', opts?.message || 'Not allowed.');
  }
  if (opts?.schoolId && caller.schoolId !== opts.schoolId) {
    throw new functions.https.HttpsError('permission-denied', opts.message || 'Wrong school.');
  }
}

async function storageUploadPngAndGetSignedUrl(params: {
  schoolId: string;
  path: string;
  buffer: Buffer;
  cacheControl?: string;
}): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(params.path);
  await file.save(params.buffer, {
    contentType: 'image/png',
    resumable: false,
    metadata: {
      cacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    },
  });
  const [url] = await file.getSignedUrl({
    action: 'read',
    // ~10 years
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  });
  return url;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function isIsoExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function json(res: functions.Response, status: number, body: unknown): void {
  res.status(status);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

function setCors(req: functions.Request, res: functions.Response): boolean {
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

async function readJsonBody(req: functions.Request): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))));
    req.on('end', () => resolve());
    req.on('error', (e) => reject(e));
  });
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeSaMobile(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  // Accept 0xx... or +27xx...
  if (/^0\d{9}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^\+27\d{9}$/.test(digits)) return digits;
  if (/^27\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function principalWelcomeEmailHtml(params: {
  schoolName: string;
  principalName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, principalName, acceptUrl, expiresInDays } = params;
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <h1 style="margin:0 0 12px;font-size:22px">You're invited to set up ${escapeHtml(schoolName)} on My Little Moments</h1>
      <p style="margin:0 0 16px">Hi ${escapeHtml(principalName)},</p>
      <p style="margin:0 0 16px">Welcome to <strong>My Little Moments</strong>. Click below to accept your invite and set up your school.</p>
      <p style="margin:24px 0">
        <a href="${acceptUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700">
          Accept Invite &amp; Set Up Your School
        </a>
      </p>
      <p style="margin:0 0 16px;color:#475569;font-size:13px">This link expires in ${expiresInDays} days.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p>
    </div>
  </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendPrincipalInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  token: string;
}): Promise<void> {
  const baseUrl = process.env.PUBLIC_APP_URL || 'https://mylittlemoments.co.za';
  const acceptUrl = `${baseUrl}/invite/accept?token=${encodeURIComponent(params.token)}`;
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're invited to set up ${params.schoolName.trim()} on My Little Moments`,
    html: principalWelcomeEmailHtml({
      schoolName: params.schoolName.trim(),
      principalName: (params.principalName && params.principalName.trim()) ? params.principalName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

/** Keys aligned with mobile ParentNotificationsScreen / shared NotificationPreferences. */
type ParentNotificationPrefKey =
  | 'nappyChange'
  | 'napTime'
  | 'meal'
  | 'checkIn'
  | 'checkOut'
  | 'activity'
  | 'medication'
  | 'incident'
  | 'media'
  | 'messages'
  | 'announcements'
  | 'events'
  | 'eventReminders';

function parentNotificationPreferenceAllows(
  prefs: Record<string, boolean> | undefined,
  key: ParentNotificationPrefKey
): boolean {
  if (!prefs || typeof prefs !== 'object') return true;
  const v = prefs[key];
  if (v === false) return false;
  return true;
}

type InAppNotificationPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

async function createInAppNotificationsForUserIds(
  db: admin.firestore.Firestore,
  userIds: string[],
  payload: InAppNotificationPayload
): Promise<void> {
  if (userIds.length === 0) return;
  const uniqueUserIds = Array.from(new Set(userIds.filter((id) => !!id)));
  if (uniqueUserIds.length === 0) return;
  const now = new Date().toISOString();
  let batch = db.batch();
  let ops = 0;
  for (const uid of uniqueUserIds) {
    const ref = db.collection('users').doc(uid).collection('notifications').doc();
    batch.set(ref, {
      title: payload.title,
      body: payload.body,
      createdAt: now,
      read: false,
      ...payload.data,
    });
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

async function getEligibleParentUserIds(
  db: admin.firestore.Firestore,
  parentIds: string[],
  prefKey: ParentNotificationPrefKey | null
): Promise<string[]> {
  const allowed: string[] = [];
  for (const uid of Array.from(new Set(parentIds))) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as { isActive?: boolean; notificationPreferences?: Record<string, boolean> };
    if (data.isActive === false) continue;
    if (prefKey && !parentNotificationPreferenceAllows(data.notificationPreferences, prefKey)) continue;
    allowed.push(uid);
  }
  return allowed;
}

async function getStaffUserIdsForSchool(
  db: admin.firestore.Firestore,
  schoolId: string,
  options?: { filterStaffByAnnouncementsPref?: boolean }
): Promise<string[]> {
  const staffIds: string[] = [];
  const staffSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  staffSnap.docs.forEach((d) => {
    const data = d.data() as {
      isActive?: boolean;
      role?: string;
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) return;
    if (
      options?.filterStaffByAnnouncementsPref &&
      (data.role === 'teacher' || data.role === 'principal') &&
      !parentNotificationPreferenceAllows(data.notificationPreferences, 'announcements')
    ) {
      return;
    }
    staffIds.push(d.id);
  });
  return staffIds;
}

/** FCM tokens for parent user ids, respecting one preference key (omit category => always allow). */
async function getFcmTokensForParentUserIds(
  db: admin.firestore.Firestore,
  parentIds: string[],
  prefKey: ParentNotificationPrefKey | null
): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const uid of parentIds) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as {
      fcmTokens?: string[];
      isActive?: boolean;
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) continue;
    if (prefKey && !parentNotificationPreferenceAllows(data.notificationPreferences, prefKey)) continue;
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    });
  }
  return tokens;
}

function reportTypeToNotificationPrefKey(reportType: string | undefined): ParentNotificationPrefKey | null {
  switch (reportType) {
    case 'nappy_change':
      return 'nappyChange';
    case 'nap_time':
      return 'napTime';
    case 'meal':
      return 'meal';
    case 'check_in':
      return 'checkIn';
    case 'check_out':
      return 'checkOut';
    case 'activity':
      return 'activity';
    case 'medication':
      return 'medication';
    case 'incident':
      return 'incident';
    default:
      return null;
  }
}

function buildReportNotificationCopy(
  report: {
    type?: string;
    notes?: string;
    mealOptionName?: string;
    photoCategory?: string;
  },
  childName: string
): { title: string; body: string } {
  const type = report.type;
  const shortNotes = report.notes && String(report.notes).trim()
    ? String(report.notes).trim().slice(0, 100)
    : '';
  if (type === 'meal') {
    const meal = (report.mealOptionName && String(report.mealOptionName).trim()) || 'Meal';
    return {
      title: `${childName}: ${meal}`,
      body: shortNotes || 'New meal update from school.',
    };
  }
  if (type === 'nap_time') {
    return {
      title: `${childName}: Nap time`,
      body: shortNotes || 'Sleep update logged.',
    };
  }
  if (type === 'nappy_change') {
    return {
      title: `${childName}: Nappy change`,
      body: shortNotes || 'Nappy update logged.',
    };
  }
  if (type === 'check_in') {
    return {
      title: `${childName}: Check in`,
      body: shortNotes || 'Checked in at school.',
    };
  }
  if (type === 'check_out') {
    return {
      title: `${childName}: Check out`,
      body: shortNotes || 'Checked out from school.',
    };
  }
  if (type === 'activity') {
    return {
      title: `${childName}: Activity`,
      body: shortNotes || 'New activity update from school.',
    };
  }
  if (type === 'medication') {
    return {
      title: `${childName}: Medication`,
      body: shortNotes || 'Medication logged.',
    };
  }
  if (type === 'incident') {
    const cat = (report.photoCategory && String(report.photoCategory).trim()) || 'Photo';
    return {
      title: `${childName}: New ${cat}`,
      body: shortNotes || 'New photo or update — tap to view.',
    };
  }
  return {
    title: `${childName}: Daily update`,
    body: shortNotes || 'New update from school.',
  };
}

// Set custom claims when a user document is created or updated in Firestore
// so that request.auth.token.role and request.auth.token.schoolId are available in security rules.
export const setUserClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const data = change.after.exists ? change.after.data() : null;
    if (!data || !userId) return null;
    const role = data.role as string | undefined;
    const schoolId = data.schoolId as string | undefined;
    const claims: Record<string, string> = {};
    if (role) claims.role = role;
    if (schoolId) claims.schoolId = schoolId;
    try {
      await admin.auth().setCustomUserClaims(userId, claims);
    } catch (e) {
      functions.logger.error('setUserClaims failed', userId, e);
    }
    return null;
  });

// When a daily report is created, send FCM to parents (respects notificationPreferences per report type).
// Email: SendGrid not wired yet; add when SENDGRID_API_KEY (or similar) is configured.
export const onReportCreated = functions.firestore
  .document('schools/{schoolId}/children/{childId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { schoolId, childId, reportId } = context.params;
    const report = snap.data() as {
      type?: string;
      notes?: string;
      mealOptionName?: string;
      photoCategory?: string;
    };
    functions.logger.info('Report created', { schoolId, childId, reportId, type: report?.type });

    const db = admin.firestore();
    const childSnap = await db.collection('schools').doc(schoolId).collection('children').doc(childId).get();
    if (!childSnap.exists) {
      functions.logger.warn('onReportCreated: child not found', { childId, schoolId });
      return null;
    }
    const child = childSnap.data() as { name?: string; parentIds?: string[] };
    const parentIds = child.parentIds || [];
    if (parentIds.length === 0) {
      functions.logger.info('onReportCreated: no parents linked', { childId });
      return null;
    }

    const prefKey = reportTypeToNotificationPrefKey(report.type);
    const eligibleParentIds = await getEligibleParentUserIds(db, parentIds, prefKey);
    const tokens = await getFcmTokensForParentUserIds(db, eligibleParentIds, prefKey);
    if (tokens.length === 0) {
      functions.logger.info('onReportCreated: no FCM tokens after prefs', { childId, prefKey });
      return null;
    }

    const childName = (child.name && String(child.name).trim()) || 'Your child';
    const { title, body } = buildReportNotificationCopy(report, childName);
    await createInAppNotificationsForUserIds(db, eligibleParentIds, {
      title,
      body,
      data: {
        type: 'daily_report',
        schoolId,
        childId,
        reportId,
        reportType: report.type ? String(report.type) : '',
      },
    });

    const msg: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: title.slice(0, 200),
        body: body.slice(0, 200),
      },
      data: {
        type: 'daily_report',
        schoolId,
        childId,
        reportId,
        reportType: report.type ? String(report.type) : '',
      },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(msg);
      functions.logger.info('onReportCreated: sent', {
        success: res.successCount,
        failed: res.failureCount,
        schoolId,
        childId,
      });
    } catch (e) {
      functions.logger.error('onReportCreated: send failed', e);
    }
    return null;
  });

// Collect FCM tokens for staff + parents at school. Parents are filtered by notificationPreferences[key] when parentPref is set.
async function getFcmTokensForSchool(
  db: admin.firestore.Firestore,
  schoolId: string,
  options?: {
    parentPref?: ParentNotificationPrefKey | null;
    /** When true, skip staff whose notificationPreferences.announcements === false (teachers/principals). */
    filterStaffByAnnouncementsPref?: boolean;
  }
): Promise<string[]> {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const staffSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  staffSnap.docs.forEach((d) => {
    const data = d.data() as {
      fcmTokens?: string[];
      isActive?: boolean;
      role?: string;
      notificationPreferences?: Record<string, boolean>;
    };
    if (data.isActive === false) return;
    if (
      options?.filterStaffByAnnouncementsPref &&
      (data.role === 'teacher' || data.role === 'principal') &&
      !parentNotificationPreferenceAllows(data.notificationPreferences, 'announcements')
    ) {
      return;
    }
    (data.fcmTokens || []).forEach((t: string) => {
      if (t && !seen.has(t)) {
        seen.add(t);
        tokens.push(t);
      }
    });
  });

  const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
  const parentIds = new Set<string>();
  childrenSnap.docs.forEach((d) => {
    const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
    parentIdsArr.forEach((uid: string) => parentIds.add(uid));
  });

  const parentPref = options?.parentPref !== undefined ? options.parentPref : null;
  const parentTokens = await getFcmTokensForParentUserIds(db, Array.from(parentIds), parentPref);
  parentTokens.forEach((t) => {
    if (t && !seen.has(t)) {
      seen.add(t);
      tokens.push(t);
    }
  });
  return tokens;
}

// Parents of children in a class. No per-type pref (daily communication has no matching toggle yet).
async function getFcmTokensForClass(db: admin.firestore.Firestore, schoolId: string, classId: string): Promise<string[]> {
  const childrenSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('classId', '==', classId)
    .get();
  const parentIds = new Set<string>();
  childrenSnap.docs.forEach((d) => {
    const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
    parentIdsArr.forEach((uid: string) => parentIds.add(uid));
  });
  return getFcmTokensForParentUserIds(db, Array.from(parentIds), null);
}

// When daily communication (planned activity) is created, notify parents in that class.
export const onDailyCommunicationCreated = functions.firestore
  .document('schools/{schoolId}/dailyCommunications/{docId}')
  .onCreate(async (snap, context) => {
    const { schoolId } = context.params;
    const data = snap.data() as { classId?: string; message?: string };
    const classId = data.classId;
    if (!classId) return null;
    const message = (data.message && String(data.message).trim()) ? String(data.message).trim().slice(0, 120) : 'Planned activity for today';
    const db = admin.firestore();
    const childrenSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('children')
      .where('classId', '==', classId)
      .get();
    const parentIds = new Set<string>();
    childrenSnap.docs.forEach((d) => {
      const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
      parentIdsArr.forEach((uid: string) => parentIds.add(uid));
    });
    const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), null);
    await createInAppNotificationsForUserIds(db, parentUserIds, {
      title: 'Planned activity for today',
      body: message.length >= 120 ? `${message}…` : message,
      data: { type: 'daily_communication', schoolId },
    });
    const tokens = await getFcmTokensForClass(db, schoolId, classId);
    if (tokens.length === 0) {
      functions.logger.info('onDailyCommunicationCreated: no FCM tokens for class', classId);
      return null;
    }
    const msg: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: 'Planned activity for today',
        body: message.length >= 120 ? `${message}…` : message,
      },
      data: { type: 'daily_communication', schoolId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(msg);
      functions.logger.info('onDailyCommunicationCreated: sent', res.successCount, 'schoolId', schoolId);
    } catch (e) {
      functions.logger.error('onDailyCommunicationCreated: send failed', e);
    }
    return null;
  });

// When an announcement is created, send push notifications to all school staff and parents.
export const onAnnouncementCreated = functions.firestore
  .document('schools/{schoolId}/announcements/{announcementId}')
  .onCreate(async (snap, context) => {
    const { schoolId } = context.params;
    const data = snap.data() as { title?: string; body?: string };
    const title = (data.title && String(data.title).trim()) || 'New announcement';
    const body = (data.body && String(data.body).trim()) ? String(data.body).trim().slice(0, 150) : '';

    const db = admin.firestore();
    const staffUserIds = await getStaffUserIdsForSchool(db, schoolId, { filterStaffByAnnouncementsPref: true });
    const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
    const parentIds = new Set<string>();
    childrenSnap.docs.forEach((d) => {
      const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
      parentIdsArr.forEach((uid: string) => parentIds.add(uid));
    });
    const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), 'announcements');
    const notifTitle = `New: ${title}`;
    const notifBody = body ? (body.length >= 150 ? `${body}…` : body) : 'Tap to view.';
    await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
      title: notifTitle,
      body: notifBody,
      data: { type: 'announcement', schoolId, announcementId: context.params.announcementId },
    });
    const tokens = await getFcmTokensForSchool(db, schoolId, {
      parentPref: 'announcements',
      filterStaffByAnnouncementsPref: true,
    });
    if (tokens.length === 0) {
      functions.logger.info('onAnnouncementCreated: no FCM tokens for school', schoolId);
      return null;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: `New: ${title}`,
        body: body ? (body.length >= 150 ? `${body}…` : body) : 'Tap to view.',
      },
      data: { type: 'announcement', schoolId, announcementId: context.params.announcementId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(message);
      functions.logger.info('onAnnouncementCreated: sent', res.successCount, 'failed', res.failureCount, 'schoolId', schoolId);
    } catch (e) {
      functions.logger.error('onAnnouncementCreated: send failed', e);
    }
    return null;
  });

// Daily job: send reminder push notifications for announcements posted 24–48h ago.
export const sendAnnouncementReminders = functions.pubsub
  .schedule('0 9 * * *') // 9 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();
    const to = new Date(now);
    to.setTime(to.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const from = new Date(to);
    from.setTime(from.getTime() - 24 * 60 * 60 * 1000); // 48h ago

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const schoolsSnap = await db.collection('schools').get();
    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const annSnap = await db.collection('schools').doc(schoolId).collection('announcements')
        .where('createdAt', '>=', fromIso)
        .where('createdAt', '<', toIso)
        .get();

      for (const annDoc of annSnap.docs) {
        const ann = annDoc.data() as { reminderSentAt?: string; title?: string };
        if (ann.reminderSentAt) continue;
        const title = (ann.title && String(ann.title).trim()) || 'Announcement';

        const tokens = await getFcmTokensForSchool(db, schoolId, {
          parentPref: 'announcements',
          filterStaffByAnnouncementsPref: true,
        });
        const staffUserIds = await getStaffUserIdsForSchool(db, schoolId, { filterStaffByAnnouncementsPref: true });
        const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
        const parentIds = new Set<string>();
        childrenSnap.docs.forEach((d) => {
          const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
          parentIdsArr.forEach((uid: string) => parentIds.add(uid));
        });
        const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), 'announcements');
        await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
          title: `Reminder: ${title}`,
          body: 'Tap to view this announcement.',
          data: { type: 'announcement_reminder', schoolId, announcementId: annDoc.id },
        });
        if (tokens.length === 0) continue;
        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Reminder: ${title}`,
            body: 'Tap to view this announcement.',
          },
          data: { type: 'announcement_reminder', schoolId, announcementId: annDoc.id },
          android: { priority: 'high' as const },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        try {
          await admin.messaging().sendEachForMulticast(message);
          await annDoc.ref.update({ reminderSentAt: new Date().toISOString() });
          functions.logger.info('sendAnnouncementReminders: sent reminder for', annDoc.id, schoolId);
        } catch (e) {
          functions.logger.error('sendAnnouncementReminders: failed', annDoc.id, e);
        }
      }
    }
    return null;
  });

// New chat message: notify the other participant (parent or teacher), respecting notificationPreferences.messages.
export const onChatMessageCreated = functions.firestore
  .document('schools/{schoolId}/chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { schoolId, chatId } = context.params;
    const msg = snap.data() as { senderId?: string; text?: string };
    const senderId = msg.senderId && String(msg.senderId).trim();
    if (!senderId) return null;

    const rawText = msg.text != null ? String(msg.text).trim() : '';
    const body =
      rawText.length > 0 ? (rawText.length > 120 ? `${rawText.slice(0, 120)}…` : rawText) : 'Tap to open the conversation.';

    const db = admin.firestore();
    const chatSnap = await db.collection('schools').doc(schoolId).collection('chats').doc(chatId).get();
    if (!chatSnap.exists) return null;
    const chat = chatSnap.data() as { teacherId?: string; parentId?: string; childId?: string };
    const { teacherId, parentId, childId } = chat;
    if (!teacherId || !parentId) return null;

    let recipientId: string | null = null;
    if (senderId === teacherId) {
      recipientId = parentId;
    } else if (senderId === parentId) {
      recipientId = teacherId;
    } else {
      return null;
    }

    const eligibleRecipientIds = await getEligibleParentUserIds(db, [recipientId], 'messages');
    if (eligibleRecipientIds.length === 0) return null;
    const tokens = await getFcmTokensForParentUserIds(db, eligibleRecipientIds, 'messages');
    if (tokens.length === 0) {
      functions.logger.info('onChatMessageCreated: no FCM tokens for recipient', recipientId);
      return null;
    }

    const senderSnap = await db.collection('users').doc(senderId).get();
    const senderName = senderSnap.exists
      ? (senderSnap.data() as { displayName?: string })?.displayName?.trim() || 'Someone'
      : 'Someone';

    let title = `Message from ${senderName}`;
    if (childId) {
      const childSnap = await db
        .collection('schools')
        .doc(schoolId)
        .collection('children')
        .doc(childId)
        .get();
      const childName = childSnap.exists
        ? (childSnap.data() as { name?: string })?.name?.trim()
        : null;
      if (childName) title = `${senderName} · ${childName}`;
    }

    const fcmMsg: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: { type: 'chat_message', schoolId, chatId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      await createInAppNotificationsForUserIds(db, eligibleRecipientIds, {
        title,
        body,
        data: { type: 'chat_message', schoolId, chatId },
      });
      const res = await admin.messaging().sendEachForMulticast(fcmMsg);
      functions.logger.info('onChatMessageCreated: sent', res.successCount, 'failed', res.failureCount, chatId);
    } catch (e) {
      functions.logger.error('onChatMessageCreated: send failed', e);
    }
    return null;
  });

// Sync custom claims from the caller's Firestore user document to their Auth token.
// Call this after login so Firestore rules (which use request.auth.token.role) work.
export const syncClaims = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    return { ok: false, message: 'No user profile' };
  }
  const data = snap.data() as { role?: string; schoolId?: string };
  const claims: Record<string, string> = {};
  if (data.role) claims.role = data.role;
  if (data.schoolId) claims.schoolId = data.schoolId;
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true };
});

// Register FCM token for push notifications (announcements, reminders, etc.). Call from mobile after getting the token.
export const saveFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const token = data?.token && typeof data.token === 'string' ? data.token.trim() : null;
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'No user profile.');
  }
  const current = (snap.data() as { fcmTokens?: string[] }).fcmTokens || [];
  if (current.includes(token)) return { ok: true };
  const updated = [...current, token].slice(-20); // keep last 20 tokens per user
  await userRef.update({ fcmTokens: updated, updatedAt: new Date().toISOString() });
  return { ok: true };
});

// Get or create a teacher–parent chat for a given child. otherParticipantId is the parent's uid (when caller is teacher) or teacher's uid (when caller is parent).
export const getOrCreateChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { schoolId, childId, otherParticipantId } = data as {
    schoolId?: string;
    childId?: string;
    otherParticipantId?: string;
  };
  if (!schoolId || !childId || !otherParticipantId || typeof schoolId !== 'string' || typeof childId !== 'string' || typeof otherParticipantId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId, childId, and otherParticipantId are required.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  const callerRole = callerData?.role;
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const child = childSnap.data() as { parentIds?: string[]; assignedTeacherId?: string; schoolId?: string; classId?: string };
  const parentIds = child.parentIds ?? [];
  const childAssignedTeacherId = child.assignedTeacherId;
  // Teacher may be assigned on the child or on the child's class
  let isTeacherForChild = childAssignedTeacherId === callerUid;
  if (callerRole === 'teacher' && !isTeacherForChild && child.classId) {
    const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get();
    const classData = classSnap.exists ? (classSnap.data() as { assignedTeacherId?: string }) : null;
    isTeacherForChild = classData?.assignedTeacherId === callerUid;
  }
  let teacherId: string;
  let parentId: string;
  if (callerRole === 'teacher') {
    if (callerData?.schoolId !== schoolId) {
      throw new functions.https.HttpsError('permission-denied', 'You are not a teacher at this school.');
    }
    if (!isTeacherForChild) {
      throw new functions.https.HttpsError('permission-denied', 'You are not the assigned teacher for this child.');
    }
    if (!parentIds.includes(otherParticipantId)) {
      throw new functions.https.HttpsError('permission-denied', 'The other participant is not a parent of this child.');
    }
    teacherId = callerUid;
    parentId = otherParticipantId;
  } else if (callerRole === 'parent') {
    if (!parentIds.includes(callerUid)) {
      throw new functions.https.HttpsError('permission-denied', 'You are not a parent of this child.');
    }
    let isTeacherForChildParent = childAssignedTeacherId === otherParticipantId;
    if (!isTeacherForChildParent && child.classId) {
      const classSnapP = await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get();
      const classDataP = classSnapP.exists ? (classSnapP.data() as { assignedTeacherId?: string }) : null;
      isTeacherForChildParent = classDataP?.assignedTeacherId === otherParticipantId;
    }
    if (!isTeacherForChildParent) {
      throw new functions.https.HttpsError('permission-denied', 'The other participant is not the assigned teacher for this child.');
    }
    teacherId = otherParticipantId;
    parentId = callerUid;
  } else {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers and parents can start a chat.');
  }
  const chatId = `${childId}_${teacherId}_${parentId}`;
  const chatRef = db.collection('schools').doc(schoolId).collection('chats').doc(chatId);
  const chatSnap = await chatRef.get();
  if (chatSnap.exists) {
    return { chatId, schoolId };
  }
  const now = new Date().toISOString();
  await chatRef.set({
    schoolId,
    teacherId,
    parentId,
    childId,
    createdAt: now,
    updatedAt: now,
  });
  return { chatId, schoolId };
});

// Create a school and a principal user in one step (direct add, no invitation).
// Callable by super_admin only. Creates: Auth user (principal), school doc, users/{uid} profile.
// setUserClaims trigger will set custom claims for the new principal.
export const createSchoolWithPrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can create schools.');
  }

  const {
    name,
    address,
    contactEmail,
    contactPhone,
    description,
    website,
    principalEmail,
    principalDisplayName,
    principalPassword,
  } = data as {
    name?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
    website?: string;
    principalEmail?: string;
    principalDisplayName?: string;
    principalPassword?: string;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'School name is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal email is required.');
  }
  if (!principalPassword || typeof principalPassword !== 'string' || principalPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Principal password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: principalEmail.trim(),
    password: principalPassword,
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
  });
  const principalUid = userRecord.uid;

  const schoolRef = db.collection('schools').doc();
  await schoolRef.set({
    name: name.trim(),
    address: address && typeof address === 'string' ? address.trim() || undefined : undefined,
    contactEmail: contactEmail && typeof contactEmail === 'string' ? contactEmail.trim() || undefined : undefined,
    contactPhone: contactPhone && typeof contactPhone === 'string' ? contactPhone.trim() || undefined : undefined,
    description: description && typeof description === 'string' ? description.trim() || undefined : undefined,
    website: website && typeof website === 'string' ? website.trim() || undefined : undefined,
    subscriptionStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });
  const schoolId = schoolRef.id;

  await db.collection('users').doc(principalUid).set({
    email: principalEmail.trim(),
    displayName: (principalDisplayName && typeof principalDisplayName === 'string')
      ? principalDisplayName.trim()
      : principalEmail.trim(),
    role: 'principal',
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  return { schoolId, principalUid };
});

// Invite-based principal onboarding (preferred external onboarding).
// Callable by super_admin only. Creates: school doc (status=PENDING), inviteTokens/{token} doc, sends email via Resend.
export const adminInvitePrincipal = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can invite principals.');
  }

  const { schoolName, principalName, principalEmail, logoUrl } = data as {
    schoolName?: string;
    principalName?: string;
    principalEmail?: string;
    schoolLogo?: string;
    logoUrl?: string;
  };
  if (!schoolName || typeof schoolName !== 'string' || !schoolName.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolName is required.');
  }
  if (!principalEmail || typeof principalEmail !== 'string' || !principalEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'principalEmail is required.');
  }

  const now = isoNow();

  const token = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const invitePayload: Record<string, unknown> = {
    token,
    email: principalEmail.trim(),
    role: 'principal',
    schoolName: schoolName.trim(),
    expiresAt,
    createdAt: now,
  };
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim()) {
    invitePayload.logoUrl = logoUrl.trim();
  }
  if (principalName && typeof principalName === 'string' && principalName.trim()) {
    invitePayload.principalName = principalName.trim();
  }
  await db.collection('inviteTokens').doc(token).set(invitePayload);

  await sendPrincipalInviteEmail({
    to: principalEmail.trim(),
    schoolName: schoolName.trim(),
    principalName: principalName?.trim(),
    token,
  });

  return { token, expiresAt, schoolName: schoolName.trim() };
});

// Resend principal invite. Reissues token when invite is already used or expired.
export const resendPrincipalInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can resend principal invites.');
  }

  const { inviteId } = data as { inviteId?: string };
  if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'inviteId is required.');
  }
  const inviteRef = db.collection('inviteTokens').doc(inviteId.trim());
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found.');
  const invite = inviteSnap.data() as {
    token: string;
    email: string;
    role: string;
    schoolName?: string;
    principalName?: string;
    logoUrl?: string;
    expiresAt: string;
    usedAt?: string;
    createdSchoolId?: string;
  };
  if (invite.role !== 'principal') {
    throw new functions.https.HttpsError('failed-precondition', 'Only principal invites can be resent.');
  }
  if (invite.createdSchoolId) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite already accepted.');
  }

  const now = isoNow();
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const needsReissue = Boolean(invite.usedAt) || expired;

  let tokenToSend = invite.token;
  let inviteIdToReturn = inviteRef.id;
  let expiresAtToReturn = invite.expiresAt;
  if (needsReissue) {
    tokenToSend = randomToken(24);
    expiresAtToReturn = addDays(new Date(), 7).toISOString();
    const payload: Record<string, unknown> = {
      token: tokenToSend,
      email: invite.email,
      role: invite.role,
      schoolName: invite.schoolName ?? 'School',
      expiresAt: expiresAtToReturn,
      createdAt: now,
      resentFromInviteId: inviteRef.id,
    };
    if (invite.principalName) payload.principalName = invite.principalName;
    if (invite.logoUrl) payload.logoUrl = invite.logoUrl;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  await sendPrincipalInviteEmail({
    to: invite.email,
    schoolName: invite.schoolName ?? 'School',
    principalName: invite.principalName,
    token: tokenToSend,
  });

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});

// Accept an invite token (principal onboarding). Creates principal Auth user + users/{uid} profile and activates the school.
export const acceptInviteToken = functions.https.onCall(async (data, context) => {
  // Public-ish: no auth required (token is bearer secret).
  const { token, password, displayName } = data as { token?: string; password?: string; displayName?: string };
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'password must be at least 6 characters.');
  }

  const db = admin.firestore();
  const ref = db.collection('inviteTokens').doc(token.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Invite token not found.');
  const invite = snap.data() as {
    token: string;
    email: string;
    role: string;
    schoolName?: string;
    principalName?: string;
    logoUrl?: string;
    schoolId?: string;
    createdSchoolId?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.usedAt) throw new functions.https.HttpsError('failed-precondition', 'Invite token already used.');
  if (invite.role !== 'principal') throw new functions.https.HttpsError('failed-precondition', 'Invite token role mismatch.');
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite token expired.');
  }

  const email = invite.email.trim();
  const now = isoNow();

  // Create or reuse existing auth user for this email.
  let principalUid: string;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    principalUid = existing.uid;
    await admin.auth().updateUser(principalUid, {
      password,
      displayName: (displayName && typeof displayName === 'string' && displayName.trim()) ? displayName.trim() : existing.displayName ?? email,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code !== 'auth/user-not-found') throw err;
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: (displayName && typeof displayName === 'string' && displayName.trim()) ? displayName.trim() : email,
    });
    principalUid = userRecord.uid;
  }

  // Create school only when invite is accepted (or reuse if previously created).
  let schoolId = invite.createdSchoolId || invite.schoolId;
  if (!schoolId) {
    const schoolRef = db.collection('schools').doc();
    schoolId = schoolRef.id;
    const slug = await reserveUniqueSchoolSlug(db, invite.schoolName || 'school');
    await db.collection('schoolSlugs').doc(slug).set({ slug, schoolId, createdAt: now }, { merge: true });
    const schoolPayload: Record<string, unknown> = {
      name: (invite.schoolName && invite.schoolName.trim()) ? invite.schoolName.trim() : 'New School',
      slug,
      status: 'ACTIVE',
      principalEmail: email,
      principalName:
        (displayName && typeof displayName === 'string' && displayName.trim())
          ? displayName.trim()
          : (invite.principalName && invite.principalName.trim())
            ? invite.principalName.trim()
            : undefined,
      subscriptionStatus: 'active',
      principalUid,
      createdAt: now,
      updatedAt: now,
    };
    if (invite.logoUrl && typeof invite.logoUrl === 'string' && invite.logoUrl.trim()) {
      schoolPayload.logoUrl = invite.logoUrl.trim();
    }
    if (!schoolPayload.principalName) delete schoolPayload.principalName;
    await schoolRef.set(schoolPayload);
  } else {
    const schoolRef = db.collection('schools').doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found for this invite.');
    await schoolRef.update({ status: 'ACTIVE', principalUid, updatedAt: now });
  }

  await db.collection('users').doc(principalUid).set(
    {
      email,
      displayName: (displayName && typeof displayName === 'string' && displayName.trim()) ? displayName.trim() : email,
      role: 'principal',
      schoolId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await Promise.all([
    ref.update({ usedAt: now, createdSchoolId: schoolId }),
  ]);

  // Create a custom token so the web can sign in without needing password again.
  const customToken = await admin.auth().createCustomToken(principalUid);
  return { ok: true, principalUid, schoolId, customToken };
});

type QrMode = 'WEB_FORM' | 'WHATSAPP_DEEP_LINK';
type QrSource = 'POSTER' | 'WHATSAPP' | 'EMAIL' | 'OPEN_DAY';

async function getSchoolOrThrow(db: admin.firestore.Firestore, schoolId: string) {
  const snap = await db.collection('schools').doc(schoolId).get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  return { id: schoolId, ...(snap.data() as any) } as {
    id: string;
    name?: string;
    slug?: string;
    logoUrl?: string;
    status?: string;
    principalUid?: string;
    contactPhone?: string;
  };
}

function buildJoinUrl(schoolSlug: string): string {
  const baseUrl = process.env.PUBLIC_APP_URL || 'https://mylittlemoments.co.za';
  return `${baseUrl}/join/${encodeURIComponent(schoolSlug)}`;
}

function buildWhatsAppDeepLink(params: { schoolName: string; schoolSlug: string; principalWhatsApp?: string | null }): string {
  const number = params.principalWhatsApp ? params.principalWhatsApp.replace(/[^\d+]/g, '') : '';
  const text = `Hi, I'd like to register my child at ${params.schoolName}.`;
  // wa.me expects international without +, but whatsapp://send allows +; simplest: use wa.me when we have a number.
  if (number) {
    const n = number.startsWith('+') ? number.slice(1) : number;
    return `https://wa.me/${encodeURIComponent(n)}?text=${encodeURIComponent(text)}`;
  }
  // Fallback: share the web join link
  return buildJoinUrl(params.schoolSlug);
}

async function buildQrPngWithLogo(params: { data: string; logoUrl?: string | null }): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(params.data, {
    type: 'png',
    width: 1024,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
  if (!params.logoUrl) return qrPng;
  const logo = await fetchImageBuffer(params.logoUrl);
  if (!logo) return qrPng;
  const base = sharp(qrPng);
  const qrMeta = await base.metadata();
  const size = Math.floor(Math.min(qrMeta.width ?? 1024, qrMeta.height ?? 1024) * 0.22);
  const logoPng = await sharp(logo)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  const pad = Math.floor(size * 0.18);
  const bgSize = size + pad * 2;
  const bg = await sharp({
    create: {
      width: bgSize,
      height: bgSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return base
    .composite([
      { input: bg, gravity: 'center' },
      { input: logoPng, gravity: 'center' },
    ])
    .png()
    .toBuffer();
}

async function buildA4PosterPng(params: { qrPng: Buffer; schoolName: string; joinUrl: string }): Promise<Buffer> {
  // A4 @ 300dpi portrait: 2480x3508
  const width = 2480;
  const height = 3508;
  const qrSize = 1500;
  const qr = await sharp(params.qrPng).resize(qrSize, qrSize).png().toBuffer();
  const bg = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  });
  const titleSvg = Buffer.from(
    `<svg width="${width}" height="420" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="120" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial" font-size="92" font-weight="800" fill="#0f172a">New parent?</text>
      <text x="50%" y="230" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial" font-size="64" font-weight="700" fill="#f97316">Scan to join ${escapeXml(params.schoolName)}</text>
      <text x="50%" y="330" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial" font-size="34" font-weight="500" fill="#475569">${escapeXml(params.joinUrl)}</text>
    </svg>`
  );
  return bg
    .composite([
      { input: titleSvg, top: 200, left: 0 },
      { input: qr, top: 700, left: Math.floor((width - qrSize) / 2) },
    ])
    .png()
    .toBuffer();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function createQrCodeInternal(params: {
  db: admin.firestore.Firestore;
  schoolId: string;
  createdByUid: string;
  classId: string | null;
  expiresAt: string | null;
  maxRegistrations: number | null;
  source: QrSource;
  mode: QrMode;
}): Promise<{ qrCodeId: string; imageUrl: string; a4ImageUrl: string; inviteUrl: string; joinUrl: string; schoolSlug: string }> {
  const { db, schoolId, createdByUid } = params;
  const school = await getSchoolOrThrow(db, schoolId);
  if (!school.slug) {
    const slug = await reserveUniqueSchoolSlug(db, school.name || 'school');
    await db.collection('schoolSlugs').doc(slug).set({ slug, schoolId, createdAt: isoNow() }, { merge: true });
    await db.collection('schools').doc(schoolId).update({ slug, updatedAt: isoNow() });
    school.slug = slug;
  }

  const now = isoNow();
  const qrRef = db.collection('schools').doc(schoolId).collection('qrCodes').doc();
  const qrCodeId = qrRef.id;

  const joinUrl = buildJoinUrl(school.slug);
  const webInviteUrl = `${joinUrl}?qr=${encodeURIComponent(qrCodeId)}`;
  const inviteUrl =
    params.mode === 'WHATSAPP_DEEP_LINK'
      ? buildWhatsAppDeepLink({
          schoolName: school.name || 'My Little Moments',
          schoolSlug: school.slug,
          principalWhatsApp: school.contactPhone || null,
        })
      : webInviteUrl;

  const qrPng = await buildQrPngWithLogo({ data: inviteUrl, logoUrl: school.logoUrl || null });
  const a4Png = await buildA4PosterPng({ qrPng, schoolName: school.name || 'Your school', joinUrl });

  const imageUrl = await storageUploadPngAndGetSignedUrl({
    schoolId,
    path: `schools/${schoolId}/qr/${qrCodeId}.png`,
    buffer: qrPng,
  });
  const a4ImageUrl = await storageUploadPngAndGetSignedUrl({
    schoolId,
    path: `schools/${schoolId}/qr/${qrCodeId}_A4.png`,
    buffer: a4Png,
  });

  await qrRef.set({
    id: qrCodeId,
    schoolId,
    schoolSlug: school.slug,
    classId: params.classId,
    childId: null,
    inviteUrl,
    joinUrl,
    imageUrl,
    a4ImageUrl,
    mode: params.mode,
    source: params.source,
    expiresAt: params.expiresAt,
    maxRegistrations: params.maxRegistrations,
    scanCount: 0,
    registrationCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: createdByUid,
  });

  return { qrCodeId, imageUrl, a4ImageUrl, inviteUrl, joinUrl, schoolSlug: school.slug };
}

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
  if (caller.role !== 'principal' || !caller.schoolId) {
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
  const school = schoolSnap.data() as { name?: string; logoUrl?: string; principalName?: string; status?: string };
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
    html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#0f172a"><div style="max-width:560px;margin:0 auto;padding:24px"><h1 style="margin:0 0 12px;font-size:22px">Welcome, ${escapeHtml(name)}!</h1><p style="margin:0 0 16px">We received your registration for <strong>${escapeHtml(childName)}</strong> at <strong>${escapeHtml(schoolName)}</strong>.</p><p style="margin:0 0 16px">Your registration is being reviewed by the class teacher. We'll email you as soon as you’re approved.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" /><p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p></div></div>`,
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

function parentApprovedEmailHtml(params: { parentName: string; schoolName: string; resetUrl: string }): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <h1 style="margin:0 0 12px;font-size:22px">You're approved! See your child's first moments</h1>
      <p style="margin:0 0 16px">Hi ${escapeHtml(params.parentName)},</p>
      <p style="margin:0 0 16px">Good news — your account for <strong>${escapeHtml(params.schoolName)}</strong> has been approved.</p>
      <p style="margin:24px 0">
        <a href="${params.resetUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700">
          Set your password &amp; sign in
        </a>
      </p>
      <p style="margin:0 0 16px;color:#475569;font-size:13px">Tip: once signed in, you’ll immediately see the latest class moments.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="margin:0;color:#64748b;font-size:12px">My Little Moments · mylittlemoments.co.za</p>
    </div>
  </div>
  `;
}

function parentRejectedEmailHtml(params: { parentName: string; schoolName: string; reason?: string | null }): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
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
  if (caller.role !== 'teacher' || !caller.schoolId) {
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
      const continueUrl = process.env.PUBLIC_APP_URL || 'https://mylittlemoments.co.za';
      const resetUrl = await admin.auth().generatePasswordResetLink(parentEmail, { url: `${continueUrl}` });
      await sendResendEmail({
        to: parentEmail,
        subject: `You're approved! See your child's first moments`,
        html: parentApprovedEmailHtml({ parentName, schoolName, resetUrl }),
      });
    }
    return { ok: true };
  }

  // Reject
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

// Parent activation helpers
export const recordParentFirstLogin = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string; parentStatus?: string; firstLoginAt?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (d.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (d.firstLoginAt) return { ok: true, firstLoginAt: d.firstLoginAt };
  const now = isoNow();
  await db.collection('users').doc(uid).update({ firstLoginAt: now, updatedAt: now });
  return { ok: true, firstLoginAt: now };
});

export const completeParentOnboardingTour = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string; parentStatus?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (d.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  const now = isoNow();
  await db.collection('users').doc(uid).set({ onboardingTourCompletedAt: now, updatedAt: now }, { merge: true });
  return { ok: true };
});

// Returns 5 latest photo/moment updates for a parent's children (for post-approval activation).
export const getParentHomeBootstrap = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; schoolId?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  const schoolId = user.schoolId;
  if (!schoolId) return { ok: true, moments: [] };

  const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').where('parentIds', 'array-contains', uid).get();
  const childIds = childrenSnap.docs.map((d) => d.id).slice(0, 10);
  const moments: Array<{ childId: string; reportId: string; timestamp: string; imageUrl?: string; type?: string }> = [];
  for (const childId of childIds) {
    const repSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('children')
      .doc(childId)
      .collection('reports')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    repSnap.docs.forEach((d) => {
      const r = d.data() as { timestamp?: string; imageUrl?: string; type?: string };
      if (r.timestamp) moments.push({ childId, reportId: d.id, timestamp: String(r.timestamp), imageUrl: r.imageUrl, type: r.type });
    });
  }
  moments.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return { ok: true, moments: moments.slice(0, 5) };
});

// Sibling registration: active parent adds another child (creates a new pending approval request).
export const addSiblingChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; schoolId?: string; displayName?: string; email?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can add children.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (!user.schoolId) throw new functions.https.HttpsError('failed-precondition', 'Missing schoolId.');
  const schoolId = user.schoolId;

  const { childFirstName, childSurname, dob, classId, popiaConsent } = data as {
    childFirstName?: string;
    childSurname?: string;
    dob?: string;
    classId?: string;
    popiaConsent?: boolean;
  };
  if (!childFirstName || !childSurname || !dob || !classId) {
    throw new functions.https.HttpsError('invalid-argument', 'childFirstName, childSurname, dob, classId are required.');
  }
  if (popiaConsent !== true) throw new functions.https.HttpsError('invalid-argument', 'POPIA consent is required.');

  const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(String(classId)).get();
  if (!classSnap.exists) throw new functions.https.HttpsError('invalid-argument', 'Invalid class.');
  const classData = classSnap.data() as { assignedTeacherId?: string; name?: string };
  const teacherId = classData.assignedTeacherId || null;

  const now = isoNow();
  const childName = `${String(childFirstName).trim()} ${String(childSurname).trim()}`.trim();
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc();
  const regRef = db.collection('schools').doc(schoolId).collection('pendingRegistrations').doc();

  const batch = db.batch();
  batch.set(childRef, {
    schoolId,
    name: childName || 'Child',
    dateOfBirth: String(dob),
    classId: String(classId),
    assignedTeacherId: teacherId || undefined,
    parentIds: [uid],
    popiaConsent: true,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(regRef, {
    id: regRef.id,
    schoolId,
    classId: String(classId),
    teacherId,
    parentUid: uid,
    childId: childRef.id,
    qrCodeId: null,
    status: 'PENDING',
    createdAt: now,
    createdVia: 'sibling',
  });
  await batch.commit();

  if (teacherId) {
    await db.collection('users').doc(teacherId).collection('notifications').doc().set({
      title: 'New registration',
      body: `${user.displayName || 'Parent'} → ${childName} (${classData.name || 'Class'})`,
      createdAt: now,
      read: false,
      type: 'pending_registration',
      schoolId,
      registrationId: regRef.id,
      parentUid: uid,
      childId: childRef.id,
      classId: String(classId),
    });
  }
  return { ok: true, childId: childRef.id, registrationId: regRef.id };
});

export const recordFirstPhotoViewed = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const { schoolId, childId, reportId } = data as { schoolId?: string; childId?: string; reportId?: string };
  if (!schoolId || !childId || !reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId, childId, reportId are required.');
  }
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const user = userSnap.data() as { role?: string; parentStatus?: string; firstPhotoViewedAt?: string };
  if (user.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  if (user.parentStatus !== 'ACTIVE') throw new functions.https.HttpsError('permission-denied', 'Parent not active.');
  if (user.firstPhotoViewedAt) return { ok: true, firstPhotoViewedAt: user.firstPhotoViewedAt };
  const now = isoNow();
  await userRef.set({ firstPhotoViewedAt: now, updatedAt: now }, { merge: true });
  await db.collection('analyticsEvents').doc().set({
    type: 'first_photo_viewed',
    createdAt: now,
    schoolId: String(schoolId),
    userId: uid,
    props: { childId: String(childId), reportId: String(reportId) },
  });
  return { ok: true, firstPhotoViewedAt: now };
});

// Create a teacher for the principal's school. Callable by principal only.
// Creates Auth user + users/{uid} profile with role=teacher, schoolId=principal's schoolId.
export const createTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can add teachers to their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, teacherPassword } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    teacherPassword?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  if (!teacherPassword || typeof teacherPassword !== 'string' || teacherPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher password must be at least 6 characters.');
  }

  const now = new Date().toISOString();

  const userRecord = await admin.auth().createUser({
    email: teacherEmail.trim(),
    password: teacherPassword,
    displayName: (teacherDisplayName && typeof teacherDisplayName === 'string')
      ? teacherDisplayName.trim()
      : teacherEmail.trim(),
  });
  const teacherUid = userRecord.uid;

  const displayName = (teacherDisplayName && typeof teacherDisplayName === 'string')
    ? teacherDisplayName.trim()
    : teacherEmail.trim();
  const preferredName = (teacherPreferredName && typeof teacherPreferredName === 'string')
    ? teacherPreferredName.trim()
    : null;
  await db.collection('users').doc(teacherUid).set({
    email: teacherEmail.trim(),
    displayName,
    ...(preferredName ? { preferredName } : {}),
    role: 'teacher',
    schoolId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return { teacherUid };
});

// Create a super admin. Callable by super_admin only.
export const createSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string }) : null;
  if (callerData?.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can add super admins.');
  }

  const { email, displayName, password } = data as {
    email?: string;
    displayName?: string;
    password?: string;
  };

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  const now = new Date().toISOString();
  const userRecord = await admin.auth().createUser({
    email: email.trim(),
    password,
    displayName: (displayName && typeof displayName === 'string') ? displayName.trim() : email.trim(),
  });
  await db.collection('users').doc(userRecord.uid).set({
    email: email.trim(),
    displayName: (displayName && typeof displayName === 'string') ? displayName.trim() : email.trim(),
    role: 'super_admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return { superAdminUid: userRecord.uid };
});

/** Revoke super admin: delete Auth user and users/{uid}. Callable by super_admin only. */
export const removeSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string }) : null;
  if (callerData?.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can remove super admins.');
  }

  const { superAdminUid } = data as { superAdminUid?: string };
  if (!superAdminUid || typeof superAdminUid !== 'string' || !superAdminUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required.');
  }
  const targetUid = superAdminUid.trim();

  if (targetUid === callerUid) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot remove your own administrator account.');
  }

  const targetRef = db.collection('users').doc(targetUid);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }
  const targetData = targetSnap.data() as { role?: string };
  if (targetData.role !== 'super_admin') {
    throw new functions.https.HttpsError('invalid-argument', 'That user is not a super administrator.');
  }

  const superAdminsSnap = await db.collection('users').where('role', '==', 'super_admin').get();
  if (superAdminsSnap.size < 2) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot remove the last super administrator.');
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('removeSuperAdmin: auth user missing, deleting Firestore only', { targetUid });
    } else {
      functions.logger.error('removeSuperAdmin: auth delete failed', e);
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? String((e as { message: string }).message)
          : 'Failed to delete user';
      throw new functions.https.HttpsError('internal', msg);
    }
  }
  await targetRef.delete();
  return { ok: true };
});

// Update a teacher's name or active status. Callable by principal only (for teachers in their school).
export const updateTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update teachers.');
  }
  const schoolId = callerData.schoolId;

  const { teacherUid, displayName, preferredName, isActive } = data as {
    teacherUid?: string;
    displayName?: string;
    preferredName?: string;
    isActive?: boolean;
  };

  if (!teacherUid || typeof teacherUid !== 'string' || !teacherUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher UID is required.');
  }

  const teacherRef = db.collection('users').doc(teacherUid);
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Teacher not found.');
  }
  const teacherData = teacherSnap.data() as { role?: string; schoolId?: string };
  if (teacherData.role !== 'teacher' || teacherData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update teachers in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (preferredName !== undefined) {
    updates.preferredName = typeof preferredName === 'string' && preferredName.trim() ? preferredName.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await teacherRef.update(updates);
  return { ok: true };
});

const MAX_PARENTS_PER_CHILD = 4;

// Check whether a user with this email already exists. Callable by principal only.
// Used to decide whether to "link existing" or "create & link" when inviting a parent.
export const checkParentEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can check parent email.');
  }
  const { email } = data as { email?: string };
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  try {
    await admin.auth().getUserByEmail(email.trim());
    return { exists: true };
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw err;
  }
});

// Invite a parent to a child. Callable by principal only.
// If a user with that email already exists, links them to the child (adds to parentIds).
// Otherwise creates Auth user + users doc (role=parent) and adds to parentIds. Max 4 parents per child.
export const inviteParentToChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentEmail, parentDisplayName, parentPhone, parentPassword } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPhone?: string;
    parentPassword?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const now = new Date().toISOString();
  const emailTrim = parentEmail.trim();
  const phone = (parentPhone && typeof parentPhone === 'string') ? parentPhone.trim() || undefined : undefined;
  const displayName = (parentDisplayName && typeof parentDisplayName === 'string') ? parentDisplayName.trim() : undefined;

  let parentUid: string;
  let linked = false;

  try {
    const existingUser = await admin.auth().getUserByEmail(emailTrim);
    parentUid = existingUser.uid;
    linked = true;

    if (parentIds.includes(parentUid)) {
      throw new functions.https.HttpsError('failed-precondition', 'This parent is already linked to this child.');
    }

    const userRef = db.collection('users').doc(parentUid);
    const userSnap = await userRef.get();
    const updates: Record<string, unknown> = { updatedAt: now, schoolId };
    if (displayName) updates.displayName = displayName;
    if (phone !== undefined) updates.phone = phone;

    if (userSnap.exists) {
      await userRef.update(updates);
    } else {
      await userRef.set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        role: 'parent',
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newParentIds = [...parentIds, parentUid];
    await childRef.update({
      parentIds: newParentIds,
      updatedAt: now,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'auth/user-not-found') {
      if (!parentPassword || typeof parentPassword !== 'string' || parentPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password (min 6 characters) is required for new accounts.');
      }
      const userRecord = await admin.auth().createUser({
        email: emailTrim,
        password: parentPassword,
        displayName: displayName ?? emailTrim,
      });
      parentUid = userRecord.uid;
      await db.collection('users').doc(parentUid).set({
        email: emailTrim,
        displayName: displayName ?? emailTrim,
        ...(phone ? { phone } : {}),
        role: 'parent',
        schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      const newParentIds = [...parentIds, parentUid];
      await childRef.update({
        parentIds: newParentIds,
        updatedAt: now,
      });
    } else if (err && typeof err === 'object' && 'message' in err && (err as { message: string }).message?.includes('already linked')) {
      throw err;
    } else {
      throw err;
    }
  }

  return { parentUid, linked };
});

// Update a parent's name, phone, or active status. Callable by principal only (for parents in their school).
export const updateParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can update parents.');
  }
  const schoolId = callerData.schoolId;

  const { parentUid, displayName, phone, isActive } = data as {
    parentUid?: string;
    displayName?: string;
    phone?: string;
    isActive?: boolean;
  };

  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }

  const parentRef = db.collection('users').doc(parentUid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentData = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentData.role !== 'parent' || parentData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only update parents in your school.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string' && displayName.trim()) {
    updates.displayName = displayName.trim();
  }
  if (phone !== undefined) {
    updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await parentRef.update(updates);
  return { ok: true };
});

// Parent updates their child's profile (name, DOB, allergies, photoURL). Only allowed fields.
export const updateChildProfileByParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const { schoolId, childId, name, dateOfBirth, allergies, photoURL } = data as {
    schoolId?: string;
    childId?: string;
    name?: string;
    dateOfBirth?: string;
    allergies?: string[];
    photoURL?: string;
  };
  if (!schoolId || !childId) throw new functions.https.HttpsError('invalid-argument', 'schoolId and childId required.');
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
  const child = childSnap.data() as { parentIds?: string[] };
  if (!child.parentIds?.includes(uid)) throw new functions.https.HttpsError('permission-denied', 'Not a parent of this child.');
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (name !== undefined && typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (dateOfBirth !== undefined && typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth;
  if (allergies !== undefined && Array.isArray(allergies)) updates.allergies = allergies.filter((a: unknown) => typeof a === 'string' && a.trim());
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  await childRef.update(updates);
  return { ok: true };
});

// Teacher updates child's profile (name, DOB, allergies, photoURL) for children in their class.
export const updateChildProfileByTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(uid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'teacher' || callerData?.schoolId === undefined) {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers can use this.');
  }
  const { schoolId, childId, name, dateOfBirth, allergies, photoURL } = data as {
    schoolId?: string;
    childId?: string;
    name?: string;
    dateOfBirth?: string;
    allergies?: string[];
    photoURL?: string;
  };
  if (!schoolId || schoolId !== callerData.schoolId || !childId) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId and childId required.');
  }
  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId);
  const childSnap = await childRef.get();
  if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
  const child = childSnap.data() as { classId?: string };
  const classSnap = child.classId ? await db.collection('schools').doc(schoolId).collection('classes').doc(child.classId).get() : null;
  const assignedTeacherId = classSnap?.exists ? (classSnap.data() as { assignedTeacherId?: string }).assignedTeacherId : null;
  if (assignedTeacherId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not the teacher for this child.');
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (name !== undefined && typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (dateOfBirth !== undefined && typeof dateOfBirth === 'string') updates.dateOfBirth = dateOfBirth;
  if (allergies !== undefined && Array.isArray(allergies)) updates.allergies = allergies.filter((a: unknown) => typeof a === 'string' && a.trim());
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  await childRef.update(updates);
  return { ok: true };
});

// Parent updates their own profile (name, lastName, email, phone, photoURL, notificationPreferences).
export const updateParentProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string };
  if (d.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can use this.');
  const { displayName, lastName, phone, photoURL, notificationPreferences } = data as {
    displayName?: string;
    lastName?: string;
    phone?: string;
    photoURL?: string;
    notificationPreferences?: Record<string, boolean>;
  };
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (displayName !== undefined && typeof displayName === 'string') updates.displayName = displayName.trim();
  if (lastName !== undefined) updates.lastName = typeof lastName === 'string' && lastName.trim() ? lastName.trim() : null;
  if (phone !== undefined) updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  if (photoURL !== undefined) updates.photoURL = typeof photoURL === 'string' && photoURL.trim() ? photoURL.trim() : null;
  if (notificationPreferences !== undefined && typeof notificationPreferences === 'object') {
    updates.notificationPreferences = notificationPreferences;
  }
  await userRef.update(updates);
  return { ok: true };
});

// Teacher updates push toggles (merged into notificationPreferences).
export const updateTeacherNotificationPreferences = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  const d = snap.data() as { role?: string; notificationPreferences?: Record<string, boolean> };
  if (d.role !== 'teacher') {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers can use this.');
  }
  const { notificationPreferences } = data as { notificationPreferences?: Record<string, boolean> };
  if (!notificationPreferences || typeof notificationPreferences !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'notificationPreferences is required.');
  }
  const allowed: ParentNotificationPrefKey[] = ['messages', 'announcements', 'checkIn', 'checkOut'];
  const merged: Record<string, boolean> = { ...(d.notificationPreferences || {}) };
  for (const key of allowed) {
    if (key in notificationPreferences) merged[key] = Boolean(notificationPreferences[key]);
  }
  await userRef.update({
    notificationPreferences: merged,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
});

// Scheduled event reminders (one day before).
export const sendEventReminders = functions.pubsub
  .schedule('0 8 * * *') // 8 AM daily
  .timeZone('Africa/Johannesburg')
  .onRun(async () => {
    const db = admin.firestore();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const startIso = tomorrow.toISOString();
    const endIso = tomorrowEnd.toISOString();

    const schoolsSnap = await db.collection('schools').get();
    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const eventsSnap = await db.collection('schools').doc(schoolId).collection('events')
        .where('startAt', '>=', startIso)
        .where('startAt', '<', endIso)
        .get();
      for (const evDoc of eventsSnap.docs) {
        const ev = evDoc.data() as { title?: string; targetType?: string; targetClassIds?: string[] };
        const title = (ev.title && String(ev.title).trim()) || 'Upcoming event';
        const staffUserIds = await getStaffUserIdsForSchool(db, schoolId);
        const childrenSnap = await db.collection('schools').doc(schoolId).collection('children').get();
        const parentIds = new Set<string>();
        childrenSnap.docs.forEach((d) => {
          const parentIdsArr = (d.data() as { parentIds?: string[] }).parentIds || [];
          parentIdsArr.forEach((uid: string) => parentIds.add(uid));
        });
        const parentUserIds = await getEligibleParentUserIds(db, Array.from(parentIds), 'eventReminders');
        await createInAppNotificationsForUserIds(db, [...staffUserIds, ...parentUserIds], {
          title: `Reminder: ${title}`,
          body: 'Happens tomorrow. Tap to view.',
          data: { type: 'event_reminder', schoolId, eventId: evDoc.id },
        });
        const tokens = await getFcmTokensForSchool(db, schoolId, { parentPref: 'eventReminders' });
        if (tokens.length === 0) continue;
        const msg: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `Reminder: ${title}`,
            body: 'Happens tomorrow. Tap to view.',
          },
          data: { type: 'event_reminder', schoolId, eventId: evDoc.id },
          android: { priority: 'high' as const },
          apns: { payload: { aps: { sound: 'default' } } },
        };
        try {
          await admin.messaging().sendEachForMulticast(msg);
          functions.logger.info('Event reminder sent', evDoc.id, schoolId);
        } catch (e) {
          functions.logger.error('Event reminder failed', evDoc.id, e);
        }
      }
    }
    return null;
  });
