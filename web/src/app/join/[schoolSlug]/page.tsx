'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type JoinInfoOk = {
  ok: true;
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  logoUrl: string | null;
  principalName: string | null;
  qrCodeId: string;
};

type JoinInfoRes = JoinInfoOk | { ok: false; error: string };

export default function JoinLandingPage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string }>();
  const slug = useMemo(() => String(params.schoolSlug || '').trim(), [params.schoolSlug]);
  const qrParam = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('qr')?.trim() || '';
  }, []);
  const apiBase = process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL || '';

  const [data, setData] = useState<JoinInfoRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ slug });
    if (qrParam) qs.set('qr', qrParam);
    fetch(`${apiBase}/joinSchoolInfo?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setData(j as JoinInfoRes);
      })
      .catch(() => {
        if (cancelled) return;
        setData({ ok: false, error: 'network_error' });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, slug, qrParam]);

  const startRegistration = async () => {
    if (!data || data.ok !== true) return;
    setCreatingSession(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/createJoinSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolSlug: slug, qrCodeId: data.qrCodeId }),
      });
      const json = (await res.json()) as { ok: boolean; sessionToken?: string };
      if (!json.ok || !json.sessionToken) throw new Error('session_failed');
      const nextQs = new URLSearchParams({ session: json.sessionToken });
      if (qrParam) nextQs.set('qr', qrParam);
      router.push(`/join/${encodeURIComponent(slug)}/register?${nextQs.toString()}`);
    } catch {
      setError('Could not start registration. Please try again.');
    } finally {
      setCreatingSession(false);
    }
  };

  const schoolName = data && data.ok ? data.schoolName : 'My Little Moments';

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-white to-primary-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : data?.ok ? (
            <>
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt={`${schoolName} logo`}
                  className="mx-auto h-16 w-16 rounded-2xl object-contain bg-white p-2"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white font-extrabold">
                  M
                </div>
              )}
              <h1 className="mt-5 text-center font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Welcome to {schoolName} on My Little Moments
              </h1>
              {data.principalName && (
                <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
                  Principal: <span className="font-semibold">{data.principalName}</span>
                </p>
              )}
              <button
                type="button"
                onClick={startRegistration}
                disabled={creatingSession}
                className="btn-primary mt-6 w-full"
              >
                {creatingSession ? 'Starting…' : 'Register My Child'}
              </button>
              {error && <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
              <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
                No app install required. Works on mobile Safari and Chrome.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Join link unavailable
              </h1>
              <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
                This QR code is expired or invalid. Please ask your school for a new invite.
              </p>
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Error: {data?.error || 'unknown'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

