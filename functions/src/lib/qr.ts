import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import QRCode = require('qrcode');
import sharp = require('sharp');
import { fetchImageBuffer, storageUploadPngAndGetSignedUrl } from './storage';
import { isoNow, reserveUniqueSchoolSlug } from './util';

export type QrMode = 'WEB_FORM' | 'WHATSAPP_DEEP_LINK';

export type QrSource = 'POSTER' | 'WHATSAPP' | 'EMAIL' | 'OPEN_DAY';

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
  const baseUrl = process.env.PUBLIC_APP_URL || 'https://app.mylittlemoments.co.za';
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

export async function createQrCodeInternal(params: {
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
