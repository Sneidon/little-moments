const apiBase = process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL || '';

export type ClassItem = { id: string; name: string; minAgeMonths: number | null; maxAgeMonths: number | null };
export type ParentDetails = { name: string; mobile: string; email: string; whatsappOptIn: boolean };
export type ChildDetails = { firstName: string; surname: string; dob: string; classId: string };

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return (await res.json()) as T;
}

export async function fetchJoinClasses(slug: string): Promise<ClassItem[]> {
  const json = await (await fetch(`${apiBase}/joinSchoolClasses?slug=${encodeURIComponent(slug)}`)).json();
  return (json?.classes as ClassItem[]) || [];
}

export async function fetchQrPrefill(slug: string, qr: string): Promise<Partial<ChildDetails> | null> {
  const json = await (await fetch(`${apiBase}/joinSchoolInfo?${new URLSearchParams({ slug, qr }).toString()}`)).json();
  if (!json?.ok) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return { firstName: str(json.prefillChildFirstName), surname: str(json.prefillChildSurname), classId: str(json.classId) };
}

// sendBeacon survives page unload, which matters for the abandonment event.
export function trackJoinEvent(sessionToken: string, payload: { type: string; step?: number; props?: Record<string, unknown> }) {
  if (!sessionToken) return;
  const body = JSON.stringify({ ...payload, joinSessionId: sessionToken });
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(`${apiBase}/trackAnalyticsEvent`, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(`${apiBase}/trackAnalyticsEvent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  } catch {
    return;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export function isPhotoTooLarge(file: File) {
  return file.size > MAX_PHOTO_BYTES;
}

export async function uploadJoinPhoto(sessionToken: string, file: File): Promise<string> {
  const json = await postJson<{ ok: boolean; photoUrl?: string; error?: string }>('uploadChildPhoto', {
    sessionToken,
    mimeType: file.type || 'image/jpeg',
    base64Data: await readAsDataUrl(file),
  });
  if (!json.ok || !json.photoUrl) throw new Error(json.error || 'upload_failed');
  return json.photoUrl;
}

export async function registerViaQr(
  sessionToken: string,
  parent: ParentDetails,
  child: ChildDetails,
  popiaConsent: boolean,
  childPhotoUrl: string | null
) {
  const json = await postJson<{ ok: boolean; teacherName?: string | null; className?: string | null; error?: string }>('registerParentViaQr', {
    sessionToken,
    parentName: parent.name,
    parentEmail: parent.email,
    parentMobile: parent.mobile,
    whatsappOptIn: parent.whatsappOptIn,
    childFirstName: child.firstName,
    childSurname: child.surname,
    dob: child.dob,
    classId: child.classId,
    popiaConsent,
    childPhotoUrl,
  });
  if (!json.ok) throw new Error(json.error || 'register_failed');
  return { teacherName: json.teacherName ?? null, className: json.className ?? null };
}

function monthsBetween(dob: Date, now: Date): number {
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

export function suggestClasses(classes: ClassItem[], dobIso: string): ClassItem[] {
  const dob = dobIso ? new Date(dobIso) : null;
  if (!dob || Number.isNaN(dob.getTime())) return classes;
  const months = monthsBetween(dob, new Date());
  const fits = classes.filter((c) => (c.minAgeMonths == null || months >= c.minAgeMonths) && (c.maxAgeMonths == null || months <= c.maxAgeMonths));
  return fits.length ? fits : classes;
}
