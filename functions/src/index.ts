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

/** Max parents linked to one child — keep in sync with `shared` / principal UI. */
const MAX_PARENTS_PER_CHILD = 4;

// Direct fallback credentials (requested) when runtime config/env is absent.
const RESEND_API_KEY_FALLBACK = 're_S3xMBH7d_3YqMBTndWbkQxihUwyaL6sj1';
const RESEND_FROM_FALLBACK = 'noreply@mylittlemoments.co.za';

/** Web origin for `/invite/accept` links in invitation emails. */
const INVITE_ACCEPT_APP_BASE_URL = 'https://littlemoments--little-moments-6647f.us-central1.hosted.app';

/** Square brand logo for HTML emails (Firebase Storage public artefact). */
const EMAIL_BRAND_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/little-moments-6647f.firebasestorage.app/o/artefacts%2Femails%2Flogos%2Fv1.png?alt=media&token=82c9425f-d900-4a8c-97d4-146fe1efac05';

/** Landscape hero banner for invite emails (Firebase Storage). */
const EMAIL_INVITE_BANNER_URL =
  'https://firebasestorage.googleapis.com/v0/b/little-moments-6647f.firebasestorage.app/o/artefacts%2Femails%2Fbanner%2Fv1.png?alt=media&token=8bb5f8d9-5c0e-42a0-b376-0c936a07e212';

function isoNow(): string {
  return new Date().toISOString();
}

/** Child roster / parent access — false means left the school (field omitted treats as enrolled). */
function childEnrollmentIsActive(data: { isActive?: boolean }): boolean {
  return data?.isActive !== false;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Advance calendar by whole business days (Mon–Fri, UTC calendar). Holidays not excluded. */
function addBusinessDaysUtc(from: Date, businessDays: number): Date {
  const d = new Date(from.getTime());
  let count = 0;
  while (count < businessDays) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
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
  const body = `My Little Moments has invited you to lead <strong>${escapeHtml(schoolName)}</strong> on My Little Moments — you&apos;re just a few clicks away from connecting your team and parents.`;
  const features =
    inviteEmailFeatureRow({
      icon: '🏷️',
      title: 'Complete your profile',
      description: 'After you accept, add school details so your dashboard is ready from day one.',
      linkUrl: inviteEmailAppUrl('/principal/profile'),
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '👥',
      title: 'Invite your teachers & parents',
      description: 'Share secure invites so staff and families can hop on — without sharing passwords.',
      linkUrl: inviteEmailAppUrl('/principal/staff'),
      linkLabel: 'Invite your team →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome to My Little Moments',
    greetingName: principalName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailBrandLogoSrcAttr(): string {
  return EMAIL_BRAND_LOGO_URL.replace(/&/g, '&amp;');
}

function inviteEmailBannerSrcAttr(): string {
  return EMAIL_INVITE_BANNER_URL.replace(/&/g, '&amp;');
}

function inviteEmailEscapeHref(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Absolute URL on the invite / web app origin (hosted). */
function inviteEmailAppUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${INVITE_ACCEPT_APP_BASE_URL}${p}`;
}

const INVITE_EMAIL_PURPLE = '#6A4BB1';
const INVITE_EMAIL_BTN_L = '#7E3AF2';
const INVITE_EMAIL_BTN_R = '#E05297';
const INVITE_EMAIL_FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INVITE_EMAIL_FONT_MONO = "'Courier New',Courier,ui-monospace,monospace";

/** Simple transactional HTML blocks (registration / approval) use this stack. */
const TRANSACTIONAL_EMAIL_UI_FONT =
  'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';

/** Compact brand row: logo replaces former gradient square; same inline layout as original header. */
function transactionalEmailLogoTop(): string {
  const src = emailBrandLogoSrcAttr();
  return `<div style="margin:0 0 20px;text-align:center;line-height:0;">
    <img src="${src}" alt="" width="32" height="32" style="display:inline-block;width:32px;height:32px;margin:0 10px 0 0;border:0;border-radius:4px;vertical-align:middle;line-height:0;" />
    <span style="font-family:${INVITE_EMAIL_FONT_MONO};font-size:17px;font-weight:700;color:${INVITE_EMAIL_PURPLE};vertical-align:middle;line-height:normal;">My Little Moments</span>
  </div>`;
}

function inviteEmailWrapDocument(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#fafafa;">
${inner}
</body>
</html>`;
}

/** One row: optional icon column + text column; icon aligns left or right. */
function inviteEmailFeatureRow(params: {
  icon: string;
  title: string;
  description: string;
  linkUrl: string;
  linkLabel: string;
  iconOnRight: boolean;
}): string {
  const iconInner = `<div style="width:48px;height:48px;border-radius:12px;background:#f3e8ff;text-align:center;line-height:48px;font-size:20px;">${params.icon}</div>`;
  const iconTd = `<td valign="top" width="56" style="width:56px;padding:20px 0 0;">${iconInner}</td>`;
  const textTd = `<td valign="top" style="padding:20px 0 0;font-family:${INVITE_EMAIL_FONT_SANS};">` +
    `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e293b;">${escapeHtml(params.title)}</p>` +
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#475569;">${escapeHtml(params.description)}</p>` +
    `<a href="${inviteEmailEscapeHref(params.linkUrl)}" target="_blank" rel="noopener noreferrer"` +
    ` style="font-family:${INVITE_EMAIL_FONT_MONO};font-size:13px;font-weight:600;color:${INVITE_EMAIL_PURPLE};text-decoration:none;">${escapeHtml(
      params.linkLabel
    )}</a></td>`;
  const cells = params.iconOnRight ? `${textTd}${iconTd}` : `${iconTd}${textTd}`;
  return `<tr>${cells}</tr>`;
}

function inviteEmailDividerRow(): string {
  return `<tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#e2e8ef;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`;
}

function inviteEmailHeroRow(): string {
  const bannerSrc = inviteEmailBannerSrcAttr();
  return `
  <tr>
    <td style="padding:0 24px 20px;line-height:0;">
      <div style="border-radius:16px;overflow:hidden;line-height:0;">
        <img src="${bannerSrc}" alt="" width="472" height="236" style="display:block;width:100%;max-width:472px;height:auto;border:0;" />
      </div>
    </td>
  </tr>`;
}

function inviteEmailBrandHeaderRow(): string {
  const src = emailBrandLogoSrcAttr();
  return `
  <tr>
    <td align="center" style="padding:28px 24px 16px;line-height:0;">
      <img src="${src}" alt="" width="32" height="32" style="display:inline-block;width:32px;height:32px;border:0;border-radius:4px;vertical-align:middle;margin-right:10px;line-height:0;" />
      <span style="display:inline-block;font-family:${INVITE_EMAIL_FONT_MONO};font-size:17px;font-weight:700;color:${INVITE_EMAIL_PURPLE};vertical-align:middle;line-height:normal;">My Little Moments</span>
    </td>
  </tr>`;
}

function inviteEmailCtaAndExpiryRows(acceptUrl: string, expiresInDays: number): string {
  const href = inviteEmailEscapeHref(acceptUrl);
  const cta = `<a href="${href}" target="_blank" rel="noopener noreferrer"` +
    ` style="display:inline-block;padding:16px 38px;border-radius:999px;font-family:${INVITE_EMAIL_FONT_MONO};` +
    `font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;background:${INVITE_EMAIL_BTN_L};background:linear-gradient(90deg,${INVITE_EMAIL_BTN_L} 0%,${INVITE_EMAIL_BTN_R} 100%);">` +
    `Accept invite &amp; get started</a>`;
  return `
  <tr><td align="center" style="padding:8px 24px 6px;">${cta}</td></tr>
  <tr><td style="padding:0 24px 22px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:12px;color:#64748b;">
    This link expires in ${expiresInDays} days.
  </td></tr>
  <tr><td style="padding:0 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>`;
}

/** Post-invite welcome: same gradient CTA as invites, no expiry line. */
function inviteEmailDashboardCtaRows(dashboardUrl: string): string {
  const href = inviteEmailEscapeHref(dashboardUrl);
  const cta = `<a href="${href}" target="_blank" rel="noopener noreferrer"` +
    ` style="display:inline-block;padding:16px 38px;border-radius:999px;font-family:${INVITE_EMAIL_FONT_MONO};` +
    `font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;background:${INVITE_EMAIL_BTN_L};background:linear-gradient(90deg,${INVITE_EMAIL_BTN_L} 0%,${INVITE_EMAIL_BTN_R} 100%);">` +
    `Open your dashboard</a>`;
  return `
  <tr><td align="center" style="padding:8px 24px 6px;">${cta}</td></tr>
  <tr><td style="padding:0 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>`;
}

function inviteEmailSupportFooterRows(): string {
  const year = new Date().getUTCFullYear();
  return `
  <tr><td style="padding:16px 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>
  <tr>
    <td style="padding:20px 24px 12px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:13px;line-height:1.55;color:#64748b;">
      Need a hand? Reply to this email or reach us at
      <a href="mailto:info@mylittlemoments.co.za" style="color:${INVITE_EMAIL_PURPLE};font-family:${INVITE_EMAIL_FONT_MONO};text-decoration:none;">info@mylittlemoments.co.za</a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 32px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:11px;line-height:1.5;color:#94a3b8;">
      &copy; ${year} My Little Moments &mdash; Caring for South Africa&apos;s little moments
    </td>
  </tr>`;
}

function inviteEmailCard(params: {
  headline: string;
  greetingName: string;
  bodyHtml: string;
  acceptUrl: string;
  expiresInDays: number;
  featuresInnerHtml: string;
}): string {
  const outer = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#fafafa;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,0.07);">
        ${inviteEmailBrandHeaderRow()}
        ${inviteEmailHeroRow()}
        <tr>
          <td align="center" style="padding:8px 24px 12px;font-family:${INVITE_EMAIL_FONT_MONO};font-size:22px;line-height:1.25;font-weight:700;color:#1e1b4b;">
            ${escapeHtml(params.headline)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 4px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;color:#334155;">
            Hi ${escapeHtml(params.greetingName)},
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 12px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;line-height:1.62;color:#334155;">
            ${params.bodyHtml}
          </td>
        </tr>
        ${inviteEmailCtaAndExpiryRows(params.acceptUrl, params.expiresInDays)}
        <tr>
          <td style="padding:12px 24px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${params.featuresInnerHtml}
            </table>
          </td>
        </tr>
        ${inviteEmailSupportFooterRows()}
      </table>
    </td>
  </tr>
</table>`;
  return inviteEmailWrapDocument(outer);
}

/** Same shell as invite emails: no &quot;Hi …,&quot; row; dashboard CTA without expiry. `headline` must be HTML-safe. */
function invitePostAcceptEmailCard(params: {
  headline: string;
  bodyHtml: string;
  dashboardUrl: string;
  featuresInnerHtml: string;
}): string {
  const outer = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#fafafa;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,0.07);">
        ${inviteEmailBrandHeaderRow()}
        ${inviteEmailHeroRow()}
        <tr>
          <td align="center" style="padding:8px 24px 12px;font-family:${INVITE_EMAIL_FONT_MONO};font-size:22px;line-height:1.25;font-weight:700;color:#1e1b4b;">
            ${params.headline}
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 12px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;line-height:1.62;color:#334155;">
            ${params.bodyHtml}
          </td>
        </tr>
        ${inviteEmailDashboardCtaRows(params.dashboardUrl)}
        <tr>
          <td style="padding:12px 24px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${params.featuresInnerHtml}
            </table>
          </td>
        </tr>
        ${inviteEmailSupportFooterRows()}
      </table>
    </td>
  </tr>
</table>`;
  return inviteEmailWrapDocument(outer);
}

function inviteEmailHeadlineFirstName(params: {
  preferred?: string | null;
  displayFromForm: string | null;
  displayFromInvite?: string | null;
  fallbackDisplay: string;
}): string {
  const firstToken = (s: string | null | undefined): string | null => {
    if (!s || typeof s !== 'string') return null;
    const t = s.trim();
    if (!t) return null;
    const w = t.split(/\s+/)[0];
    return w || null;
  };
  return (
    firstToken(params.preferred) ??
    firstToken(params.displayFromForm) ??
    firstToken(params.displayFromInvite) ??
    firstToken(params.fallbackDisplay) ??
    'there'
  );
}

function parentPostAcceptWelcomeEmailHtml(params: {
  firstName: string;
  schoolName: string;
  childName: string;
  dashboardUrl: string;
}): string {
  const { firstName, schoolName, childName, dashboardUrl } = params;
  const headline = `Welcome, ${escapeHtml(firstName)}!`;
  const body =
    `You&apos;re now connected to <strong>${escapeHtml(schoolName)}</strong> on My Little Moments. From here you&apos;ll get photos, milestones and daily updates about <strong>${escapeHtml(
      childName
    )}</strong> &mdash; straight from their teachers.`;
  const features =
    inviteEmailFeatureRow({
      icon: '📱',
      title: "1. Add your child's details",
      description:
        'Complete the profile with allergies, medical info and emergency contacts so teachers have everything they need to keep your little one safe.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Add my child →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '2. Download the mobile app',
      description:
        'Get instant photos, updates and reminders on your phone — so you can be part of the day, even when you&apos;re at work.',
      linkUrl: INVITE_ACCEPT_APP_BASE_URL,
      linkLabel: 'App Store • Google Play',
      iconOnRight: false,
    });
  return invitePostAcceptEmailCard({
    headline,
    bodyHtml: body,
    dashboardUrl,
    featuresInnerHtml: features,
  });
}

async function sendParentPostAcceptWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  childName: string;
}): Promise<void> {
  const dashboardUrl = inviteEmailAppUrl('/login');
  await sendResendEmail({
    to: params.to.trim(),
    subject: `Welcome — you're connected on My Little Moments`,
    html: parentPostAcceptWelcomeEmailHtml({
      firstName: params.firstName.trim() || 'there',
      schoolName: params.schoolName.trim(),
      childName: params.childName.trim(),
      dashboardUrl,
    }),
  });
}

function teacherPostAcceptWelcomeEmailHtml(params: {
  firstName: string;
  schoolName: string;
  className: string;
  dashboardUrl: string;
}): string {
  const { firstName, schoolName, className, dashboardUrl } = params;
  const headline = `You&apos;re all set, ${escapeHtml(firstName)}!`;
  const body =
    `Your teacher account at <strong>${escapeHtml(schoolName)}</strong> is ready to go for <strong>${escapeHtml(className)}</strong>. Here are a few quick steps to help you start sharing little moments with parents today.`;
  const login = inviteEmailAppUrl('/login');
  const features =
    inviteEmailFeatureRow({
      icon: '🏷️',
      title: '1. Complete your profile',
      description:
        'Add your photo, qualifications and a short intro so parents know who is caring for their child.',
      linkUrl: login,
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '2. View your assigned class',
      description:
        'See your classroom roster, children&apos;s profiles and any important notes from parents.',
      linkUrl: login,
      linkLabel: 'View my class →',
      iconOnRight: false,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '3. Learn daily check-ins',
      description:
        'Log meals, naps, nappies and activities in seconds — parents get instant updates throughout the day.',
      linkUrl: login,
      linkLabel: 'See how check-ins work →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '4. Download the mobile app',
      description:
        'Capture photos and log moments on the go — straight from your phone in the classroom or on the playground.',
      linkUrl: INVITE_ACCEPT_APP_BASE_URL,
      linkLabel: 'App Store • Google Play',
      iconOnRight: false,
    });
  return invitePostAcceptEmailCard({
    headline,
    bodyHtml: body,
    dashboardUrl,
    featuresInnerHtml: features,
  });
}

async function sendTeacherPostAcceptWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  className: string;
}): Promise<void> {
  const dashboardUrl = inviteEmailAppUrl('/login');
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're all set — your My Little Moments teacher account is ready`,
    html: teacherPostAcceptWelcomeEmailHtml({
      firstName: params.firstName.trim() || 'there',
      schoolName: params.schoolName.trim(),
      className: params.className.trim(),
      dashboardUrl,
    }),
  });
}

async function sendPrincipalInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
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

function superAdminInviteEmailHtml(params: {
  inviteeName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { inviteeName, acceptUrl, expiresInDays } = params;
  const body = `You&apos;ve been invited to join My Little Moments as a <strong>super administrator</strong>. Accept below to choose your password — then pick up invitations, schools and support right from your console.`;
  const features =
    inviteEmailFeatureRow({
      icon: '🛡️',
      title: 'Open the Admin console',
      description: 'Manage invitations, principals and visibility across schools from one place.',
      linkUrl: inviteEmailAppUrl('/admin'),
      linkLabel: 'Go to Admin →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '🏫',
      title: 'Invite schools',
      description: 'Send onboarding links so each principal can activate their school workspace.',
      linkUrl: inviteEmailAppUrl('/admin/schools'),
      linkLabel: 'View schools →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Administrator!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

async function sendSuperAdminInviteEmail(params: {
  to: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're invited as a My Little Moments administrator`,
    html: superAdminInviteEmailHtml({
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

function teacherInviteEmailHtml(params: {
  schoolName: string;
  inviteeName: string;
  principalName: string;
  className?: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, inviteeName, principalName, className, acceptUrl, expiresInDays } = params;
  const classPhrase = className
    ? ` as a teacher for <strong>${escapeHtml(className)}</strong>`
    : ' as a teacher';
  const body =
    `<strong>${escapeHtml(principalName)}</strong> has invited you to join <strong>${escapeHtml(schoolName)}</strong>${classPhrase}` +
    ` on My Little Moments — let&apos;s make every little moment count.`;
  const features =
    inviteEmailFeatureRow({
      icon: '👋',
      title: 'Complete your profile',
      description: 'Add your photo and a short introduction so families know who is caring for their little ones.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📋',
      title: 'Meet your class',
      description: 'Open the mobile app after you accept — your assigned class and roster are ready there.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'View my class →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Teacher!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

async function sendTeacherInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  className?: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  const principalLabel =
    params.principalName && params.principalName.trim() ? params.principalName.trim() : 'Your principal';
  await sendResendEmail({
    to: params.to.trim(),
    subject: `${params.schoolName.trim()} invited you as a teacher on My Little Moments`,
    html: teacherInviteEmailHtml({
      schoolName: params.schoolName.trim(),
      principalName: principalLabel,
      ...(params.className && params.className.trim() ? { className: params.className.trim() } : {}),
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

function parentInviteEmailHtml(params: {
  schoolName: string;
  childName: string;
  inviteeName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, childName, inviteeName, acceptUrl, expiresInDays } = params;
  const body =
    `<strong>${escapeHtml(schoolName)}</strong> has invited you to join <strong>${escapeHtml(schoolName)}</strong> on My Little Moments — so you never miss a moment of <strong>${escapeHtml(
      childName
    )}</strong>&apos;s day.`;
  const features =
    inviteEmailFeatureRow({
      icon: '📝',
      title: "Add your child's details",
      description: 'After you accept, complete allergies, medical info and contacts so teachers have exactly what they need.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Add my child →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: 'Download the mobile app',
      description: 'Photos, routines and reminders feel best on your phone — jump in once your account is linked.',
      linkUrl: INVITE_ACCEPT_APP_BASE_URL,
      linkLabel: 'Get the app →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Parent!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

async function sendParentInviteEmail(params: {
  to: string;
  schoolName: string;
  childName: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're invited to follow ${params.childName.trim()} on My Little Moments`,
    html: parentInviteEmailHtml({
      schoolName: params.schoolName.trim(),
      childName: params.childName.trim(),
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
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

/** Left-school children must not keep a classId or they still match class roster queries. */
export const onSchoolChildUpdatedClearClassIfInactive = functions.firestore
  .document('schools/{schoolId}/children/{childId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data() as { isActive?: boolean; classId?: string | null };
    if (childEnrollmentIsActive(after)) return null;
    const classId = after.classId;
    if (classId == null || classId === '') return null;
    await change.after.ref.update({ classId: null, updatedAt: isoNow() });
    functions.logger.info('onSchoolChildUpdatedClearClassIfInactive: cleared class', {
      schoolId: context.params.schoolId,
      childId: context.params.childId,
      previousClassId: classId,
    });
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
    const child = childSnap.data() as { name?: string; parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(child)) {
      functions.logger.info('onReportCreated: child not actively enrolled — skipping parent notify', { childId });
      return null;
    }
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
    const row = d.data() as { parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(row)) return;
    const parentIdsArr = row.parentIds || [];
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
    const row = d.data() as { parentIds?: string[]; isActive?: boolean };
    if (!childEnrollmentIsActive(row)) return;
    const parentIdsArr = row.parentIds || [];
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
      const row = d.data() as { parentIds?: string[]; isActive?: boolean };
      if (!childEnrollmentIsActive(row)) return;
      const parentIdsArr = row.parentIds || [];
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
      const row = d.data() as { parentIds?: string[]; isActive?: boolean };
      if (!childEnrollmentIsActive(row)) return;
      const parentIdsArr = row.parentIds || [];
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
          const row = d.data() as { parentIds?: string[]; isActive?: boolean };
          if (!childEnrollmentIsActive(row)) return;
          const parentIdsArr = row.parentIds || [];
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

const FIRESTORE_DELETE_CHUNK = 450;

async function deleteCollectionShallow(
  db: admin.firestore.Firestore,
  colRef: admin.firestore.CollectionReference
): Promise<void> {
  const snap = await colRef.limit(FIRESTORE_DELETE_CHUNK).get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
  await deleteCollectionShallow(db, colRef);
}

/** Remove all documents under `schools/{schoolId}` (nested subcollections first). */
async function purgeFirestoreSchoolTree(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const schoolRef = db.collection('schools').doc(schoolId);

  const chatsSnap = await schoolRef.collection('chats').get();
  for (const c of chatsSnap.docs) {
    await deleteCollectionShallow(db, c.ref.collection('messages'));
    await c.ref.delete();
  }

  const qrSnap = await schoolRef.collection('qrCodes').get();
  for (const q of qrSnap.docs) {
    await deleteCollectionShallow(db, q.ref.collection('scanLogs'));
    await q.ref.delete();
  }

  const childrenSnap = await schoolRef.collection('children').get();
  for (const ch of childrenSnap.docs) {
    await deleteCollectionShallow(db, ch.ref.collection('reports'));
    await ch.ref.delete();
  }

  const flatCollections = [
    'classes',
    'announcements',
    'events',
    'foodMenus',
    'foodMenusWeekly',
    'dailyCommunications',
    'mealOptions',
    'pendingRegistrations',
  ] as const;
  for (const name of flatCollections) {
    await deleteCollectionShallow(db, schoolRef.collection(name));
  }
}

async function unlinkUsersFromSchool(db: admin.firestore.Firestore, schoolId: string, nowIso: string): Promise<void> {
  const FieldValue = admin.firestore.FieldValue;
  const usersSnap = await db.collection('users').where('schoolId', '==', schoolId).get();
  for (const d of usersSnap.docs) {
    const role = (d.data() as { role?: string }).role;
    const ref = d.ref;
    const patch =
      role === 'principal' || role === 'teacher'
        ? { schoolId: FieldValue.delete(), isActive: false, updatedAt: nowIso }
        : { schoolId: FieldValue.delete(), updatedAt: nowIso };
    await ref.update(patch);
    const after = await ref.get();
    const rd = after.data() as { role?: string } | undefined;
    const claims: Record<string, string> = {};
    if (rd?.role) claims.role = rd.role;
    try {
      await admin.auth().setCustomUserClaims(d.id, claims);
    } catch (e) {
      functions.logger.warn('unlinkUsersFromSchool: setCustomUserClaims failed', d.id, e);
    }
  }
}

async function deleteInviteTokensForSchool(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const [bySchoolId, byCreated] = await Promise.all([
    db.collection('inviteTokens').where('schoolId', '==', schoolId).get(),
    db.collection('inviteTokens').where('createdSchoolId', '==', schoolId).get(),
  ]);
  const seen = new Set<string>();
  const del = async (docs: admin.firestore.QueryDocumentSnapshot[]): Promise<void> => {
    for (const docSnap of docs) {
      if (seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);
      await docSnap.ref.delete();
    }
  };
  await del(bySchoolId.docs);
  await del(byCreated.docs);
}

/** Sets subscription suspended + onboarding SUSPENDED (or restores). Callable by super_admin only. */
export const adminSetSchoolSuspended = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (caller.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can change school suspension.');
  }
  const { schoolId, suspended } = data as { schoolId?: string; suspended?: boolean };
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  if (typeof suspended !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'suspended must be a boolean.');
  }
  const ref = db.collection('schools').doc(schoolId.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const now = isoNow();
  await ref.update({
    subscriptionStatus: suspended ? ('suspended' as const) : ('active' as const),
    status: suspended ? ('SUSPENDED' as const) : ('ACTIVE' as const),
    updatedAt: now,
  });
  return { ok: true as const };
});

/** Runs full purge; no-ops cleanly if school doc is already gone. */
async function runSchoolDeletionPurge(db: admin.firestore.Firestore, schoolId: string): Promise<void> {
  const sid = schoolId.trim();
  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    functions.logger.warn('runSchoolDeletionPurge: school already absent', { schoolId: sid });
    return;
  }
  const slug = (schoolSnap.data() as { slug?: string }).slug;

  functions.logger.warn('runSchoolDeletionPurge: starting', { schoolId: sid });
  await purgeFirestoreSchoolTree(db, sid);

  const now = isoNow();
  await unlinkUsersFromSchool(db, sid, now);
  await deleteInviteTokensForSchool(db, sid);

  if (slug && typeof slug === 'string' && slug.trim()) {
    const slugRef = db.collection('schoolSlugs').doc(slug.trim());
    const slugSnap = await slugRef.get();
    const mappedId = slugSnap.exists ? (slugSnap.data() as { schoolId?: string }).schoolId : null;
    if (mappedId === sid) {
      await slugRef.delete();
    }
  }

  await schoolRef.delete();
  functions.logger.warn('runSchoolDeletionPurge: completed', { schoolId: sid });
}

async function claimSchoolDeletionJob(
  db: admin.firestore.Firestore,
  jobRef: admin.firestore.DocumentReference
): Promise<boolean> {
  const nowIso = isoNow();
  let claimed = false;
  await db.runTransaction(async (tx) => {
    const s = await tx.get(jobRef);
    if (!s.exists) return;
    const d = s.data() as { status?: string; scheduledDeleteAt?: string };
    if (d.status !== 'pending') return;
    if (!d.scheduledDeleteAt || d.scheduledDeleteAt > nowIso) return;
    tx.update(jobRef, { status: 'processing', startedAt: nowIso });
    claimed = true;
  });
  return claimed;
}

/** Picks due jobs and deletes school data after the 7-business-day waiting period. */
export const processSchoolDeletionJobs = functions.pubsub.schedule('every 30 minutes').onRun(async () => {
  const db = admin.firestore();
  const nowIso = isoNow();
  const due = await db
    .collection('schoolDeletionJobs')
    .where('status', '==', 'pending')
    .where('scheduledDeleteAt', '<=', nowIso)
    .limit(25)
    .get();

  for (const jobDoc of due.docs) {
    const jobRef = jobDoc.ref;
    const row = jobDoc.data() as { schoolId?: string };
    const schoolId = row.schoolId ? String(row.schoolId).trim() : '';
    if (!schoolId) {
      await jobRef.update({
        status: 'failed',
        resolvedAt: nowIso,
        errorMessage: 'missing_schoolId_on_job',
      });
      continue;
    }

    const claimed = await claimSchoolDeletionJob(db, jobRef);
    if (!claimed) continue;

    try {
      await runSchoolDeletionPurge(db, schoolId);
      await jobRef.update({ status: 'completed', resolvedAt: isoNow() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      functions.logger.error('processSchoolDeletionJobs: purge failed', schoolId, e);
      await jobRef.update({
        status: 'failed',
        resolvedAt: isoNow(),
        errorMessage: msg.slice(0, 2000),
      });
    }
  }
  return null;
});

/**
 * Schedules full data deletion after 7 business days (UTC Mon–Fri). Suspends the school immediately.
 * Callable by super_admin only. `confirmation` must match school name (trimmed).
 */
export const adminQueueSchoolDeletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (caller.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can queue school deletion.');
  }
  const { schoolId, confirmation } = data as { schoolId?: string; confirmation?: string };
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'schoolId is required.');
  }
  if (!confirmation || typeof confirmation !== 'string' || !confirmation.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'confirmation must match the school name.');
  }
  const sid = schoolId.trim();

  const dup = await db
    .collection('schoolDeletionJobs')
    .where('schoolId', '==', sid)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!dup.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'A deletion is already scheduled for this school. Cancel it first or wait for it to complete.'
    );
  }

  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const schoolName = (schoolSnap.data() as { name?: string }).name;
  const expectedName = (schoolName && String(schoolName).trim()) || '';
  if (!expectedName || confirmation.trim() !== expectedName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Confirmation does not match this school\'s name. Type the exact name to continue.'
    );
  }

  let requestedByEmail: string | null = null;
  try {
    const u = await admin.auth().getUser(context.auth.uid);
    requestedByEmail = u.email ?? null;
  } catch {
    // ignore
  }

  const now = isoNow();
  const scheduledDeleteAt = addBusinessDaysUtc(new Date(), 7).toISOString();
  const jobRef = db.collection('schoolDeletionJobs').doc();
  const batch = db.batch();
  batch.set(jobRef, {
    schoolId: sid,
    schoolName: expectedName,
    status: 'pending',
    requestedAt: now,
    scheduledDeleteAt,
    requestedByUid: context.auth.uid,
    requestedByEmail,
  });
  batch.update(schoolRef, {
    subscriptionStatus: 'suspended',
    status: 'SUSPENDED',
    updatedAt: now,
  });
  await batch.commit();

  return { ok: true as const, jobId: jobRef.id, scheduledDeleteAt };
});

/** Cancel a pending deletion job and reactivate the school if the document still exists. */
export const adminCancelSchoolDeletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const db = admin.firestore();
  const caller = await requireCallerProfile(db, context.auth.uid);
  if (caller.role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can cancel scheduled deletions.');
  }
  const { jobId } = data as { jobId?: string };
  if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId is required.');
  }
  const ref = db.collection('schoolDeletionJobs').doc(jobId.trim());
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Job not found.');
  const row = snap.data() as { status?: string; schoolId?: string };
  if (row.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Only pending jobs can be cancelled.');
  }
  const sid = row.schoolId ? String(row.schoolId).trim() : '';
  if (!sid) throw new functions.https.HttpsError('failed-precondition', 'Invalid job payload.');
  const now = isoNow();
  await ref.update({
    status: 'cancelled',
    resolvedAt: now,
    cancelledByUid: context.auth.uid,
  });
  const schoolRef = db.collection('schools').doc(sid);
  const schoolSnap = await schoolRef.get();
  if (schoolSnap.exists) {
    await schoolRef.update({
      subscriptionStatus: 'active',
      status: 'ACTIVE',
      updatedAt: now,
    });
  }
  return { ok: true as const };
});

// Invite-based principal onboarding (preferred external onboarding).
// Callable by super_admin only. Creates inviteTokens/{token} doc only; school is created when the invite is accepted.
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

/** Invite-only onboarding for additional super admins (same UX as principal school invites). */
export const adminInviteSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can invite administrators.');
  }

  const { email, displayName } = data as { email?: string; displayName?: string };
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }
  const emailNorm = email.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  let authUser: admin.auth.UserRecord | null = null;
  try {
    authUser = await admin.auth().getUserByEmail(emailNorm);
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }
  if (authUser) {
    const prof = await db.collection('users').doc(authUser.uid).get();
    if (prof.exists) {
      const role = (prof.data() as { role?: string }).role;
      if (role === 'super_admin') {
        throw new functions.https.HttpsError('already-exists', 'This user is already a super administrator.');
      }
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This email already has an account with a different role. Use another email.'
      );
    }
  }

  const now = isoNow();
  const token = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token,
    email: emailNorm,
    role: 'super_admin',
    expiresAt,
    createdAt: now,
  };
  if (displayName && typeof displayName === 'string' && displayName.trim()) {
    payload.inviteeDisplayName = displayName.trim();
  }
  await db.collection('inviteTokens').doc(token).set(payload);

  await sendSuperAdminInviteEmail({
    to: emailNorm,
    inviteeName: (displayName && typeof displayName === 'string') ? displayName.trim() || undefined : undefined,
    token,
  });

  return { token, expiresAt };
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

/** Resend super admin invite token (reuse or reissue when used/expired). */
export const resendSuperAdminInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as { role?: string })?.role : null;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super admins can resend admin invites.');
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
    inviteeDisplayName?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.role !== 'super_admin') {
    throw new functions.https.HttpsError('failed-precondition', 'Only super admin invites can be resent from this action.');
  }
  if (invite.usedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite already accepted.');
  }

  const now = isoNow();
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const needsReissue = expired;

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
      expiresAt: expiresAtToReturn,
      createdAt: now,
      resentFromInviteId: inviteRef.id,
    };
    if (invite.inviteeDisplayName) payload.inviteeDisplayName = invite.inviteeDisplayName;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  await sendSuperAdminInviteEmail({
    to: invite.email,
    inviteeName: invite.inviteeDisplayName,
    token: tokenToSend,
  });

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});

/** Resend teacher or parent invite. Super admin any school; principal only their school. */
export const resendSchoolInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};
  const isSuperAdminCaller = callerData.role === 'super_admin';
  const principalSchoolId =
    callerData.role === 'principal' && callerData.schoolId ? callerData.schoolId : null;
  if (!isSuperAdminCaller && !principalSchoolId) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot resend this invite.');
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
    schoolId?: string;
    schoolName?: string;
    childId?: string;
    childName?: string;
    className?: string;
    inviteeDisplayName?: string;
    inviteePreferredName?: string;
    inviteePhone?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.role !== 'teacher' && invite.role !== 'parent') {
    throw new functions.https.HttpsError('failed-precondition', 'Only teacher or parent invites can use this action.');
  }
  if (principalSchoolId && invite.schoolId !== principalSchoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Invite is not for your school.');
  }
  if (invite.usedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite already accepted.');
  }

  const now = isoNow();
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const needsReissue = expired;

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
      expiresAt: expiresAtToReturn,
      createdAt: now,
      resentFromInviteId: inviteRef.id,
    };
    if (invite.schoolId) payload.schoolId = invite.schoolId;
    if (invite.schoolName) payload.schoolName = invite.schoolName;
    if (invite.childId) payload.childId = invite.childId;
    if (invite.childName) payload.childName = invite.childName;
    if (invite.className) payload.className = invite.className;
    if (invite.inviteeDisplayName) payload.inviteeDisplayName = invite.inviteeDisplayName;
    if (invite.inviteePreferredName) payload.inviteePreferredName = invite.inviteePreferredName;
    if (invite.inviteePhone) payload.inviteePhone = invite.inviteePhone;
    const newRef = db.collection('inviteTokens').doc(tokenToSend);
    await newRef.set(payload);
    inviteIdToReturn = newRef.id;
  } else {
    await inviteRef.set({ lastResentAt: now }, { merge: true });
  }

  const schoolName = invite.schoolName ?? 'Your school';
  let principalNameEmail: string | undefined;
  if (invite.role === 'teacher' && invite.schoolId) {
    const sSnap = await db.collection('schools').doc(invite.schoolId).get();
    if (sSnap.exists) {
      principalNameEmail = (sSnap.data() as { principalName?: string }).principalName?.trim() || undefined;
    }
  }
  if (invite.role === 'teacher') {
    await sendTeacherInviteEmail({
      to: invite.email,
      schoolName,
      principalName: principalNameEmail,
      className: invite.className,
      inviteeName: invite.inviteeDisplayName,
      token: tokenToSend,
    });
  } else {
    await sendParentInviteEmail({
      to: invite.email,
      schoolName,
      childName: invite.childName ?? 'your child',
      inviteeName: invite.inviteeDisplayName,
      token: tokenToSend,
    });
  }

  return { ok: true, inviteId: inviteIdToReturn, token: tokenToSend, expiresAt: expiresAtToReturn, reissued: needsReissue };
});

/** Remove inviteTokens doc. Super admin: any. Principal: only teacher/parent invites for their school. */
export const deleteInviteToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};

  const { inviteId } = data as { inviteId?: string };
  if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'inviteId is required.');
  }
  const inviteRef = db.collection('inviteTokens').doc(inviteId.trim());
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found.');
  const inv = inviteSnap.data() as { role?: string; schoolId?: string };

  const isSuper = callerData.role === 'super_admin';
  const isPrincipalOk =
    callerData.role === 'principal' &&
    callerData.schoolId &&
    (inv.role === 'teacher' || inv.role === 'parent') &&
    inv.schoolId === callerData.schoolId;

  if (!isSuper && !isPrincipalOk) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot delete this invite.');
  }

  await inviteRef.delete();
  return { ok: true };
});

/** Teacher & parent invites for the principal's school (for Invitations page). */
export const listPrincipalSchoolInvites = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : {};
  if (callerData.role !== 'principal' || !callerData.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can list school invitations.');
  }
  const schoolId = callerData.schoolId;
  const schoolSnapForInvites = await db.collection('schools').doc(schoolId).get();
  const schoolDataForInvites = schoolSnapForInvites.exists
    ? (schoolSnapForInvites.data() as { principalName?: string })
    : null;
  const schoolPrincipalNameForInvites =
    schoolDataForInvites?.principalName?.trim() || undefined;
  const snap = await db.collection('inviteTokens').where('schoolId', '==', schoolId).get();
  type Row = {
    id: string;
    /** Same as invite doc id in normal flow; echoed for `/invite/accept?token=` deep links on the Principal UI. */
    token: string;
    email: string;
    role: 'teacher' | 'parent';
    schoolName?: string;
    /** Principal / school display name for teacher-invite PDF/email-style copy. */
    principalName?: string;
    /** When the teacher was invited for a specific class. */
    className?: string;
    childId?: string;
    childName?: string;
    inviteeDisplayName?: string;
    expiresAt: string;
    usedAt?: string;
    createdAt: string;
  };
  const invites: Row[] = [];
  for (const d of snap.docs) {
    const row = d.data() as {
      token?: string;
      email?: string;
      role?: string;
      schoolName?: string;
      className?: string;
      childId?: string;
      childName?: string;
      inviteeDisplayName?: string;
      expiresAt?: string;
      usedAt?: string;
      createdAt?: string;
    };
    if (row.role !== 'teacher' && row.role !== 'parent') continue;
    if (!row.email || !row.expiresAt || !row.createdAt) continue;
    const bearer =
      row.token && typeof row.token === 'string' && row.token.trim() ? row.token.trim() : d.id;
    const classLabel =
      row.className && typeof row.className === 'string' && row.className.trim()
        ? row.className.trim()
        : undefined;
    invites.push({
      id: d.id,
      token: bearer,
      email: row.email,
      role: row.role as 'teacher' | 'parent',
      schoolName: row.schoolName,
      principalName: schoolPrincipalNameForInvites,
      className: classLabel,
      childId: row.childId,
      childName: row.childName,
      inviteeDisplayName: row.inviteeDisplayName,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }
  invites.sort((a, b) => {
    const aTs = new Date(a.createdAt).getTime();
    const bTs = new Date(b.createdAt).getTime();
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  return { invites };
});

/** Public: whether an invite link is still usable (no password). */
export const peekInviteToken = functions.https.onCall(async (data) => {
  const { token } = data as { token?: string };
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required.');
  }
  const db = admin.firestore();
  const snap = await db.collection('inviteTokens').doc(token.trim()).get();
  if (!snap.exists) return { status: 'not_found' as const };
  const row = snap.data() as { expiresAt?: string; usedAt?: string; role?: string };
  const role = typeof row.role === 'string' ? row.role : undefined;
  if (row.usedAt) return { status: 'used' as const, role };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { status: 'expired' as const, role };
  }
  return { status: 'pending' as const, role };
});

// Accept an invite token: principal onboarding (school) or super admin onboarding (Admin console).
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
    className?: string;
    inviteeDisplayName?: string;
    inviteePreferredName?: string;
    inviteePhone?: string;
    childId?: string;
    childName?: string;
    logoUrl?: string;
    schoolId?: string;
    createdSchoolId?: string;
    expiresAt: string;
    usedAt?: string;
  };
  if (invite.usedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'This invite has already been accepted.');
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'Invite token expired.');
  }

  const emailRaw = invite.email.trim();
  const emailNorm = emailRaw.toLowerCase();
  const now = isoNow();

  if (invite.role === 'super_admin') {
    const displayFromForm =
      displayName && typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : null;
    const displayFromInvite =
      invite.inviteeDisplayName && typeof invite.inviteeDisplayName === 'string' && invite.inviteeDisplayName.trim()
        ? invite.inviteeDisplayName.trim()
        : null;

    let superUid: string;
    try {
      const existing = await admin.auth().getUserByEmail(emailNorm);
      superUid = existing.uid;
      const profSnap = await db.collection('users').doc(superUid).get();
      if (profSnap.exists) {
        const role = (profSnap.data() as { role?: string }).role;
        if (role && role !== 'super_admin') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This email already has an account with a different role.'
          );
        }
        if (role === 'super_admin') {
          throw new functions.https.HttpsError('failed-precondition', 'This account is already a super administrator.');
        }
      }
      const authDisplay =
        displayFromForm ?? displayFromInvite ?? existing.displayName ?? emailRaw;
      await admin.auth().updateUser(superUid, {
        password,
        displayName: authDisplay,
      });
    } catch (err: unknown) {
      if (err instanceof functions.https.HttpsError) throw err;
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code !== 'auth/user-not-found') throw err;
      const newDisplay = displayFromForm ?? displayFromInvite ?? emailRaw;
      const userRecord = await admin.auth().createUser({
        email: emailNorm,
        password,
        displayName: newDisplay,
      });
      superUid = userRecord.uid;
    }

    const finalDisplayName = displayFromForm ?? displayFromInvite ?? emailRaw;
    const userRef = db.collection('users').doc(superUid);
    const priorSnap = await userRef.get();
    const userPayload: Record<string, unknown> = {
      email: emailNorm,
      displayName: finalDisplayName,
      role: 'super_admin',
      isActive: true,
      updatedAt: now,
    };
    if (!priorSnap.exists) userPayload.createdAt = now;
    await userRef.set(userPayload, { merge: true });

    await ref.update({ usedAt: now });

    const customToken = await admin.auth().createCustomToken(superUid);
    return { ok: true as const, superAdminUid: superUid, customToken };
  }

  if (invite.role === 'teacher') {
    const schoolIdInvite = invite.schoolId?.trim();
    if (!schoolIdInvite) {
      throw new functions.https.HttpsError('invalid-argument', 'Invite is missing school information.');
    }
    const schoolSnap = await db.collection('schools').doc(schoolIdInvite).get();
    if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');

    const displayFromForm =
      displayName && typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : null;
    const displayFromInvite =
      invite.inviteeDisplayName && typeof invite.inviteeDisplayName === 'string' && invite.inviteeDisplayName.trim()
        ? invite.inviteeDisplayName.trim()
        : null;
    const preferredFromInvite =
      invite.inviteePreferredName &&
      typeof invite.inviteePreferredName === 'string' &&
      invite.inviteePreferredName.trim()
        ? invite.inviteePreferredName.trim()
        : null;

    let teacherUid: string;
    try {
      const existing = await admin.auth().getUserByEmail(emailNorm);
      teacherUid = existing.uid;
      const profSnap = await db.collection('users').doc(teacherUid).get();
      if (profSnap.exists) {
        const p = profSnap.data() as { role?: string; schoolId?: string };
        const r = p.role;
        const sid = p.schoolId;
        if (r === 'teacher' && sid === schoolIdInvite) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'You are already a teacher at this school.'
          );
        }
        if (r && r !== 'teacher') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This email already has an account with a different role.'
          );
        }
        if (r === 'teacher' && sid && sid !== schoolIdInvite) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This email is already used as a teacher at another school.'
          );
        }
      }
      const authDisplay = displayFromForm ?? displayFromInvite ?? existing.displayName ?? emailRaw;
      await admin.auth().updateUser(teacherUid, {
        password,
        displayName: authDisplay,
      });
    } catch (err: unknown) {
      if (err instanceof functions.https.HttpsError) throw err;
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code !== 'auth/user-not-found') throw err;
      const newDisplay = displayFromForm ?? displayFromInvite ?? emailRaw;
      const userRecord = await admin.auth().createUser({
        email: emailNorm,
        password,
        displayName: newDisplay,
      });
      teacherUid = userRecord.uid;
    }

    const finalDisplayName = displayFromForm ?? displayFromInvite ?? emailRaw;
    const userRef = db.collection('users').doc(teacherUid);
    const priorSnap = await userRef.get();
    const userPayload: Record<string, unknown> = {
      email: emailNorm,
      displayName: finalDisplayName,
      ...(preferredFromInvite ? { preferredName: preferredFromInvite } : {}),
      role: 'teacher',
      schoolId: schoolIdInvite,
      isActive: true,
      updatedAt: now,
    };
    if (!priorSnap.exists) userPayload.createdAt = now;
    await userRef.set(userPayload, { merge: true });

    await ref.update({ usedAt: now });

    const schoolRow = schoolSnap.data() as { name?: string };
    const schoolLabel =
      (invite.schoolName && invite.schoolName.trim()) ||
      (schoolRow.name && schoolRow.name.trim()) ||
      'your school';
    const classRaw = invite.className;
    const classLabel =
      classRaw && typeof classRaw === 'string' && classRaw.trim()
        ? classRaw.trim()
        : 'your assigned class';
    const headlineFirst = inviteEmailHeadlineFirstName({
      preferred: preferredFromInvite,
      displayFromForm,
      displayFromInvite,
      fallbackDisplay: finalDisplayName,
    });
    void sendTeacherPostAcceptWelcomeEmail({
      to: emailRaw,
      firstName: headlineFirst,
      schoolName: schoolLabel,
      className: classLabel,
    }).catch((e) =>
      functions.logger.warn('sendTeacherPostAcceptWelcomeEmail failed', {
        message: e instanceof Error ? e.message : String(e),
      })
    );

    return { ok: true as const, teacherUid };
  }

  if (invite.role === 'parent') {
    const schoolIdInvite = invite.schoolId?.trim();
    const childIdInvite = invite.childId?.trim();
    if (!schoolIdInvite || !childIdInvite) {
      throw new functions.https.HttpsError('invalid-argument', 'Invite is missing school or child information.');
    }

    const childRef = db.collection('schools').doc(schoolIdInvite).collection('children').doc(childIdInvite);
    const childSnap = await childRef.get();
    if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child not found.');
    let parentIds = (childSnap.data() as { parentIds?: string[] })?.parentIds ?? [];
    if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
      );
    }

    const displayFromForm =
      displayName && typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : null;
    const displayFromInvite =
      invite.inviteeDisplayName && typeof invite.inviteeDisplayName === 'string' && invite.inviteeDisplayName.trim()
        ? invite.inviteeDisplayName.trim()
        : null;
    const preferredFromInvite =
      invite.inviteePreferredName &&
      typeof invite.inviteePreferredName === 'string' &&
      invite.inviteePreferredName.trim()
        ? invite.inviteePreferredName.trim()
        : null;
    const phoneHint =
      invite.inviteePhone && typeof invite.inviteePhone === 'string' && invite.inviteePhone.trim()
        ? invite.inviteePhone.trim()
        : undefined;
    const finalDisplayName = displayFromForm ?? displayFromInvite ?? emailRaw;

    let parentUid: string;
    try {
      const existing = await admin.auth().getUserByEmail(emailNorm);
      parentUid = existing.uid;
      if (parentIds.includes(parentUid)) {
        throw new functions.https.HttpsError('failed-precondition', 'You are already linked to this child.');
      }
      const userRef = db.collection('users').doc(parentUid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const udata = userSnap.data() as { role?: string };
        if (udata.role && udata.role !== 'parent') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This email is already used for a staff or admin account.'
          );
        }
      }
      await admin.auth().updateUser(parentUid, {
        password,
        displayName: finalDisplayName,
      });
      const updates: Record<string, unknown> = {
        email: emailNorm,
        displayName: finalDisplayName,
        schoolId: schoolIdInvite,
        role: 'parent',
        isActive: true,
        updatedAt: now,
      };
      if (phoneHint !== undefined) updates.phone = phoneHint;
      if (userSnap.exists) {
        await userRef.update(updates);
      } else {
        await userRef.set({
          ...updates,
          createdAt: now,
        });
      }
      parentIds = [...parentIds, parentUid];
      await childRef.update({ parentIds, updatedAt: now });
    } catch (err: unknown) {
      if (err instanceof functions.https.HttpsError) throw err;
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code !== 'auth/user-not-found') throw err;
      const userRecord = await admin.auth().createUser({
        email: emailNorm,
        password,
        displayName: finalDisplayName,
      });
      parentUid = userRecord.uid;
      await db
        .collection('users')
        .doc(parentUid)
        .set({
          email: emailNorm,
          displayName: finalDisplayName,
          ...(phoneHint ? { phone: phoneHint } : {}),
          role: 'parent',
          schoolId: schoolIdInvite,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      parentIds = [...parentIds, parentUid];
      await childRef.update({ parentIds, updatedAt: now });
    }

    await ref.update({ usedAt: now });

    let schoolLabel = invite.schoolName?.trim();
    if (!schoolLabel) {
      const sSnap = await db.collection('schools').doc(schoolIdInvite).get();
      if (sSnap.exists) {
        const n = (sSnap.data() as { name?: string }).name;
        schoolLabel = n?.trim();
      }
    }
    if (!schoolLabel) schoolLabel = 'your school';
    const childRow = childSnap.data() as { name?: string };
    let childLabel = invite.childName?.trim();
    if (!childLabel) childLabel = childRow.name?.trim() || '';
    if (!childLabel) childLabel = 'your child';
    const headlineFirst = inviteEmailHeadlineFirstName({
      preferred: preferredFromInvite,
      displayFromForm,
      displayFromInvite,
      fallbackDisplay: finalDisplayName,
    });
    void sendParentPostAcceptWelcomeEmail({
      to: emailRaw,
      firstName: headlineFirst,
      schoolName: schoolLabel,
      childName: childLabel,
    }).catch((e) =>
      functions.logger.warn('sendParentPostAcceptWelcomeEmail failed', {
        message: e instanceof Error ? e.message : String(e),
      })
    );

    return { ok: true as const, parentUid };
  }

  if (invite.role !== 'principal') {
    throw new functions.https.HttpsError('failed-precondition', 'Invite token role mismatch.');
  }

  const email = emailNorm;

  // Create or reuse existing auth user for this email.
  let principalUid: string;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    principalUid = existing.uid;
    await admin.auth().updateUser(principalUid, {
      password,
      displayName: (displayName && typeof displayName === 'string' && displayName.trim())
        ? displayName.trim()
        : existing.displayName ?? email,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code !== 'auth/user-not-found') throw err;
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: (displayName && typeof displayName === 'string' && displayName.trim())
        ? displayName.trim()
        : email,
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

  const customToken = await admin.auth().createCustomToken(principalUid);
  return { ok: true as const, principalUid, schoolId, customToken };
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

  const childrenSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', uid)
    .get();
  const childIds = childrenSnap.docs
    .filter((d) => childEnrollmentIsActive(d.data() as { isActive?: boolean }))
    .map((d) => d.id)
    .slice(0, 10);
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
    isActive: true,
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

/** Principal sends teacher an email invite; they set a password via acceptInviteToken. */
export const principalInviteTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite teachers.');
  }
  const schoolId = callerData.schoolId;

  const { teacherEmail, teacherDisplayName, teacherPreferredName, classId } = data as {
    teacherEmail?: string;
    teacherDisplayName?: string;
    teacherPreferredName?: string;
    classId?: string;
  };

  if (!teacherEmail || typeof teacherEmail !== 'string' || !teacherEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher email is required.');
  }
  const emailNorm = teacherEmail.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) throw new functions.https.HttpsError('not-found', 'School not found.');
  const schoolData = schoolSnap.data() as { name?: string; principalName?: string };
  const schoolName = (schoolData.name ?? 'Your school').trim();
  const principalDisplayNameEmail =
    schoolData.principalName && schoolData.principalName.trim()
      ? schoolData.principalName.trim()
      : undefined;

  let inviteClassLabel: string | undefined;
  if (classId && typeof classId === 'string' && classId.trim()) {
    const cSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(classId.trim()).get();
    if (cSnap.exists) {
      const n = (cSnap.data() as { name?: string }).name;
      inviteClassLabel = n && typeof n === 'string' && n.trim() ? n.trim() : undefined;
    }
  }

  try {
    const existingAuth = await admin.auth().getUserByEmail(emailNorm);
    const prof = await db.collection('users').doc(existingAuth.uid).get();
    if (prof.exists) {
      const p = prof.data() as { role?: string; schoolId?: string };
      if (p.role === 'teacher' && p.schoolId === schoolId) {
        throw new functions.https.HttpsError(
          'already-exists',
          'This teacher is already part of your school.'
        );
      }
      if (p.role && p.role !== 'teacher') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This email is already used for a different role. Use another email.'
        );
      }
      if (p.role === 'teacher' && p.schoolId && p.schoolId !== schoolId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This email belongs to a teacher at another school.'
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const tok = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token: tok,
    email: emailNorm,
    role: 'teacher',
    schoolId,
    schoolName,
    expiresAt,
    createdAt: now,
  };
  if (teacherDisplayName && typeof teacherDisplayName === 'string' && teacherDisplayName.trim()) {
    payload.inviteeDisplayName = teacherDisplayName.trim();
  }
  if (teacherPreferredName && typeof teacherPreferredName === 'string' && teacherPreferredName.trim()) {
    payload.inviteePreferredName = teacherPreferredName.trim();
  }
  if (inviteClassLabel) payload.className = inviteClassLabel;
  await db.collection('inviteTokens').doc(tok).set(payload);

  await sendTeacherInviteEmail({
    to: emailNorm,
    schoolName,
    principalName: principalDisplayNameEmail,
    className: inviteClassLabel,
    inviteeName: typeof teacherDisplayName === 'string' ? teacherDisplayName.trim() || undefined : undefined,
    token: tok,
  });

  return { token: tok, expiresAt };
});

/** Principal emails a parent invite for one child — accept links them via acceptInviteToken. */
export const principalInviteParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can invite parents.');
  }
  const schoolId = callerData.schoolId;

  const {
    childId,
    parentEmail,
    parentDisplayName,
    parentPhone,
  } = data as {
    childId?: string;
    parentEmail?: string;
    parentDisplayName?: string;
    parentPhone?: string;
  };

  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentEmail || typeof parentEmail !== 'string' || !parentEmail.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent email is required.');
  }
  const emailNorm = parentEmail.trim().toLowerCase();
  if (!isValidEmail(emailNorm)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(childId.trim());
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const childData = childSnap.data() as { name?: string; parentIds?: string[] };
  const parentIds = childData.parentIds ?? [];
  if (parentIds.length >= MAX_PARENTS_PER_CHILD) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `This child already has the maximum of ${MAX_PARENTS_PER_CHILD} parents.`
    );
  }

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = ((schoolSnap.data() as { name?: string })?.name ?? 'Your school').trim();
  const childName = (childData.name && childData.name.trim()) ? childData.name.trim() : 'your child';

  try {
    const existingAuth = await admin.auth().getUserByEmail(emailNorm);
    if (parentIds.includes(existingAuth.uid)) {
      throw new functions.https.HttpsError('failed-precondition', 'This parent is already linked to this child.');
    }
    const prof = await db.collection('users').doc(existingAuth.uid).get();
    if (prof.exists) {
      const p = prof.data() as { role?: string };
      if (p.role && p.role !== 'parent') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This email is already used for a staff or admin account. Use a different email.'
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) throw err;
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    if (code !== 'auth/user-not-found') throw err;
  }

  const now = isoNow();
  const tok = randomToken(24);
  const expiresAt = addDays(new Date(), 7).toISOString();
  const payload: Record<string, unknown> = {
    token: tok,
    email: emailNorm,
    role: 'parent',
    schoolId,
    childId: childId.trim(),
    schoolName,
    childName,
    expiresAt,
    createdAt: now,
  };
  if (parentDisplayName && typeof parentDisplayName === 'string' && parentDisplayName.trim()) {
    payload.inviteeDisplayName = parentDisplayName.trim();
  }
  if (parentPhone && typeof parentPhone === 'string' && parentPhone.trim()) {
    payload.inviteePhone = parentPhone.trim();
  }
  await db.collection('inviteTokens').doc(tok).set(payload);

  await sendParentInviteEmail({
    to: emailNorm,
    schoolName,
    childName,
    inviteeName: typeof parentDisplayName === 'string' ? parentDisplayName.trim() || undefined : undefined,
    token: tok,
  });

  return { token: tok, expiresAt };
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

/** Remove a teacher from the school: unassign all classes & children, delete Auth + users doc. Principal only. */
export const principalDeleteTeacher = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can delete teachers from their school.');
  }
  const schoolId = callerData.schoolId;

  const { teacherUid } = data as { teacherUid?: string };
  if (!teacherUid || typeof teacherUid !== 'string' || !teacherUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Teacher UID is required.');
  }
  const targetUid = teacherUid.trim();

  const teacherRef = db.collection('users').doc(targetUid);
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Teacher not found.');
  }
  const teacherData = teacherSnap.data() as { role?: string; schoolId?: string };
  if (teacherData.role !== 'teacher' || teacherData.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'You can only delete teachers in your school.');
  }

  const del = admin.firestore.FieldValue.delete();
  const batchSize = 400;

  const [classesSnap, childrenSnap] = await Promise.all([
    db.collection('schools').doc(schoolId).collection('classes').where('assignedTeacherId', '==', targetUid).get(),
    db.collection('schools').doc(schoolId).collection('children').where('assignedTeacherId', '==', targetUid).get(),
  ]);

  const refsToClear = [...classesSnap.docs.map((d) => d.ref), ...childrenSnap.docs.map((d) => d.ref)];
  for (let i = 0; i < refsToClear.length; i += batchSize) {
    const slice = refsToClear.slice(i, i + batchSize);
    const batch = db.batch();
    for (const ref of slice) {
      batch.update(ref, { assignedTeacherId: del });
    }
    await batch.commit();
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('principalDeleteTeacher: auth user missing, deleting Firestore profile only', {
        targetUid,
      });
    } else {
      functions.logger.error('principalDeleteTeacher: auth delete failed', e);
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

  await teacherRef.delete();
  return {
    ok: true as const,
    unassignedClassCount: classesSnap.size,
    unassignedChildCount: childrenSnap.size,
  };
});

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

async function deleteParentAuthAndProfile(db: admin.firestore.Firestore, parentUid: string): Promise<void> {
  try {
    await admin.auth().deleteUser(parentUid);
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found') {
      functions.logger.warn('deleteParentAuthAndProfile: auth user missing, deleting Firestore only', { parentUid });
    } else {
      functions.logger.error('deleteParentAuthAndProfile: auth delete failed', e);
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
  await db.collection('users').doc(parentUid).delete();
}

/** Remove parent from one child. If they are not on any other child at this school, delete their account. */
export const principalRemoveParentFromChild = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can remove parents.');
  }
  const schoolId = callerData.schoolId;

  const { childId, parentUid } = data as { childId?: string; parentUid?: string };
  if (!childId || typeof childId !== 'string' || !childId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Child ID is required.');
  }
  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }
  const cid = childId.trim();
  const puid = parentUid.trim();

  const parentRef = db.collection('users').doc(puid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentProfile = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentProfile.role !== 'parent' || parentProfile.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only remove parents in your school.');
  }

  const childRef = db.collection('schools').doc(schoolId).collection('children').doc(cid);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Child not found.');
  }
  const parentIdsOnChild = (childSnap.data() as { parentIds?: string[] }).parentIds ?? [];
  if (!parentIdsOnChild.includes(puid)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This parent is not linked to this child.'
    );
  }

  const now = isoNow();
  await childRef.update({
    parentIds: admin.firestore.FieldValue.arrayRemove(puid),
    updatedAt: now,
  });

  const stillLinked = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', puid)
    .limit(1)
    .get();

  if (!stillLinked.empty) {
    return { ok: true as const, deletedAccount: false };
  }

  await deleteParentAuthAndProfile(db, puid);
  return { ok: true as const, deletedAccount: true };
});

/** Unlink parent from every child at the school and delete their account. Callable by principal only. */
export const principalDeleteParent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? (callerSnap.data() as { role?: string; schoolId?: string }) : null;
  if (callerData?.role !== 'principal' || !callerData?.schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Only principals can delete parents.');
  }
  const schoolId = callerData.schoolId;

  const { parentUid } = data as { parentUid?: string };
  if (!parentUid || typeof parentUid !== 'string' || !parentUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Parent UID is required.');
  }
  const puid = parentUid.trim();

  const parentRef = db.collection('users').doc(puid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent not found.');
  }
  const parentProfile = parentSnap.data() as { role?: string; schoolId?: string };
  if (parentProfile.role !== 'parent' || parentProfile.schoolId !== schoolId) {
    throw new functions.https.HttpsError('permission-denied', 'Can only delete parents in your school.');
  }

  const linkedSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('children')
    .where('parentIds', 'array-contains', puid)
    .get();

  const now = isoNow();
  const batchCap = 400;
  let batch = db.batch();
  let ops = 0;
  for (const d of linkedSnap.docs) {
    batch.update(d.ref, {
      parentIds: admin.firestore.FieldValue.arrayRemove(puid),
      updatedAt: now,
    });
    ops++;
    if (ops >= batchCap) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  await deleteParentAuthAndProfile(db, puid);
  return { ok: true as const, unlinkedFromChildCount: linkedSnap.size };
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
          const row = d.data() as { parentIds?: string[]; isActive?: boolean };
          if (!childEnrollmentIsActive(row)) return;
          const parentIdsArr = row.parentIds || [];
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
