'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type ClassItem = { id: string; name: string; minAgeMonths: number | null; maxAgeMonths: number | null };

function monthsBetween(dob: Date, now: Date): number {
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

function withinAgeRange(months: number, c: ClassItem): boolean {
  const min = c.minAgeMonths;
  const max = c.maxAgeMonths;
  if (min != null && months < min) return false;
  if (max != null && months > max) return false;
  return true;
}

export default function JoinRegisterPage() {
  const params = useParams<{ schoolSlug: string }>();
  const searchParams = useSearchParams();
  const slug = useMemo(() => String(params.schoolSlug || '').trim(), [params.schoolSlug]);
  const sessionToken = useMemo(() => searchParams.get('session')?.trim() || '', [searchParams]);
  const qrParam = useMemo(() => searchParams.get('qr')?.trim() || '', [searchParams]);
  const apiBase = process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL || '';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [parent, setParent] = useState({
    name: '',
    mobile: '',
    email: '',
    whatsappOptIn: false,
  });
  const [child, setChild] = useState({
    firstName: '',
    surname: '',
    dob: '',
    classId: '',
  });
  const [consent, setConsent] = useState({ popiaConsent: false });
  const [photo, setPhoto] = useState<{ uploading: boolean; url: string | null }>({ uploading: false, url: null });
  const [success, setSuccess] = useState<{ teacherName: string | null; className: string | null } | null>(null);

  const track = async (payload: { type: string; step?: number; props?: Record<string, unknown> }) => {
    if (!sessionToken) return;
    try {
      const body = JSON.stringify({ type: payload.type, joinSessionId: sessionToken, step: payload.step, props: payload.props });
      // Prefer sendBeacon for unload safety.
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        (navigator as any).sendBeacon(`${apiBase}/trackAnalyticsEvent`, blob);
        return;
      }
      await fetch(`${apiBase}/trackAnalyticsEvent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!sessionToken) return;
    const handler = () => {
      if (step !== 4) {
        void track({ type: 'registration_abandoned', step });
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionToken, step]);

  useEffect(() => {
    let cancelled = false;
    setLoadingClasses(true);
    fetch(`${apiBase}/joinSchoolClasses?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = (j?.classes as ClassItem[]) || [];
        setClasses(list);
      })
      .catch(() => {
        if (cancelled) return;
        setClasses([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, slug]);

  useEffect(() => {
    if (!qrParam) return;
    let cancelled = false;
    const qs = new URLSearchParams({ slug, qr: qrParam });
    fetch(`${apiBase}/joinSchoolInfo?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) {
          const firstName = typeof j.prefillChildFirstName === 'string' ? j.prefillChildFirstName : '';
          const surname = typeof j.prefillChildSurname === 'string' ? j.prefillChildSurname : '';
          const classId = typeof j.classId === 'string' ? j.classId : '';
          setChild((c) => ({
            ...c,
            firstName: firstName || c.firstName,
            surname: surname || c.surname,
            classId: classId || c.classId,
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiBase, slug, qrParam]);

  const suggestedClasses = useMemo(() => {
    if (!child.dob) return classes;
    const dob = new Date(child.dob);
    if (Number.isNaN(dob.getTime())) return classes;
    const ageMonths = monthsBetween(dob, new Date());
    const filtered = classes.filter((c) => withinAgeRange(ageMonths, c));
    return filtered.length ? filtered : classes;
  }, [classes, child.dob]);

  const uploadPhoto = async (file: File) => {
    if (!sessionToken) {
      setError('Missing session token. Please go back and try again.');
      return;
    }
    setError('');
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo is too large (max 2MB).');
      return;
    }
    setPhoto({ uploading: true, url: null });
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read_failed'));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${apiBase}/uploadChildPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, mimeType: file.type || 'image/jpeg', base64Data }),
      });
      const json = (await res.json()) as { ok: boolean; photoUrl?: string; error?: string };
      if (!json.ok || !json.photoUrl) throw new Error(json.error || 'upload_failed');
      setPhoto({ uploading: false, url: json.photoUrl });
    } catch {
      setPhoto({ uploading: false, url: null });
      setError('Failed to upload photo. You can continue without it.');
    }
  };

  const next = () => {
    setError('');
    if (step === 1) {
      if (!parent.name.trim() || !parent.mobile.trim() || !parent.email.trim()) {
        setError('Please fill in your name, mobile, and email.');
        return;
      }
      void track({ type: 'registration_step_completed', step: 1 });
      setStep(2);
    } else if (step === 2) {
      if (!child.firstName.trim() || !child.surname.trim() || !child.dob || !child.classId) {
        setError('Please complete child details (including class).');
        return;
      }
      void track({ type: 'registration_step_completed', step: 2, props: { classId: child.classId } });
      setStep(3);
    } else if (step === 3) {
      if (!consent.popiaConsent) {
        setError('POPIA consent is required.');
        return;
      }
      void track({ type: 'registration_step_completed', step: 3, props: { hasPhoto: Boolean(photo.url) } });
      void submit();
    }
  };

  const back = () => {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const submit = async () => {
    if (!sessionToken) {
      setError('Missing session token. Please go back and try again.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/registerParentViaQr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          parentName: parent.name,
          parentEmail: parent.email,
          parentMobile: parent.mobile,
          whatsappOptIn: parent.whatsappOptIn,
          childFirstName: child.firstName,
          childSurname: child.surname,
          dob: child.dob,
          classId: child.classId,
          popiaConsent: consent.popiaConsent,
          childPhotoUrl: photo.url,
        }),
      });
      const json = (await res.json()) as { ok: boolean; teacherName?: string | null; className?: string | null; error?: string };
      if (!json.ok) throw new Error(json.error || 'register_failed');
      setSuccess({ teacherName: json.teacherName ?? null, className: json.className ?? null });
      void track({ type: 'registration_step_completed', step: 4 });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-warm-50 to-primary-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Step {step} of 4
            </p>
            {step !== 4 && (
              <div className="h-2 w-28 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-primary-600"
                  style={{ width: `${(step / 4) * 100}%` }}
                  aria-hidden
                />
              </div>
            )}
          </div>

          {step === 1 && (
            <div className="mt-5 space-y-4">
              <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-50">Parent info</h1>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                <input className="input-base" value={parent.name} onChange={(e) => setParent((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Mobile number</label>
                <input className="input-base" value={parent.mobile} onChange={(e) => setParent((p) => ({ ...p, mobile: e.target.value }))} placeholder="0xx xxx xxxx or +27xx xxx xxxx" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input className="input-base" type="email" value={parent.email} onChange={(e) => setParent((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={parent.whatsappOptIn} onChange={(e) => setParent((p) => ({ ...p, whatsappOptIn: e.target.checked }))} />
                WhatsApp opt-in
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-4">
              <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-50">Child info</h1>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">First name</label>
                  <input className="input-base" value={child.firstName} onChange={(e) => setChild((c) => ({ ...c, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Surname</label>
                  <input className="input-base" value={child.surname} onChange={(e) => setChild((c) => ({ ...c, surname: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date of birth</label>
                <input className="input-base" type="date" value={child.dob} onChange={(e) => setChild((c) => ({ ...c, dob: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Class</label>
                <select
                  className="input-base"
                  value={child.classId}
                  onChange={(e) => setChild((c) => ({ ...c, classId: e.target.value }))}
                  disabled={loadingClasses}
                >
                  <option value="">{loadingClasses ? 'Loading…' : 'Select a class'}</option>
                  {suggestedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Classes are suggested based on your child’s age (from DOB).
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-4">
              <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-50">Photo & consent</h1>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Child photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadPhoto(f);
                  }}
                />
                {photo.uploading && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Uploading…</p>}
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="Uploaded child" className="mt-3 h-24 w-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                )}
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={consent.popiaConsent}
                  onChange={(e) => setConsent({ popiaConsent: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  I consent to the processing of my child’s data in line with POPIA.{' '}
                  <a href="/privacy" className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">
                    View privacy policy
                  </a>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your child’s privacy is protected under POPIA.</div>
                </span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="mt-5 space-y-3 text-center">
              <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">You’re in!</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {success?.teacherName
                  ? `${success.teacherName} will approve your account shortly.`
                  : 'A teacher will approve your account shortly.'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Once approved, you’ll be able to log in and see your child’s latest moments.
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {step !== 4 && (
            <div className="mt-6 flex gap-2">
              {step !== 1 && (
                <button type="button" onClick={back} disabled={submitting} className="btn-secondary w-full">
                  Back
                </button>
              )}
              <button type="button" onClick={next} disabled={submitting} className="btn-primary w-full">
                {step === 3 ? (submitting ? 'Submitting…' : 'Finish') : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

