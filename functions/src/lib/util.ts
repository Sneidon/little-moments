import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

export function isoNow(): string {
  return new Date().toISOString();
}

/** Child roster / parent access — false means left the school (field omitted treats as enrolled). */
export function childEnrollmentIsActive(data: { isActive?: boolean }): boolean {
  return data?.isActive !== false;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Advance calendar by whole business days (Mon–Fri, UTC calendar). Holidays not excluded. */
export function addBusinessDaysUtc(from: Date, businessDays: number): Date {
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

export function randomToken(bytes = 24): string {
  // base64url without padding
  return crypto.randomBytes(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function reserveUniqueSchoolSlug(db: admin.firestore.Firestore, schoolName: string): Promise<string> {
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

export function isIsoExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function normalizeSaMobile(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  // Accept 0xx... or +27xx...
  if (/^0\d{9}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^\+27\d{9}$/.test(digits)) return digits;
  if (/^27\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
