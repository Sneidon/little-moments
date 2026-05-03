'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { app, auth } from '@/config/firebase';
import { MOBILE_APP_IOS_APP_STORE_URL, MOBILE_APP_PLAY_STORE_URL } from '@/config/mobileApp';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeartIcon } from '@/components/HeartIcon';

type PeekInviteResponse =
  | { status: 'not_found' }
  | { status: 'used'; role?: string }
  | { status: 'expired'; role?: string }
  | { status: 'pending'; role?: string };

type AcceptInviteResponse =
  | { ok: true; principalUid: string; schoolId: string; customToken: string }
  | { ok: true; superAdminUid: string; customToken: string }
  | { ok: true; teacherUid: string }
  | { ok: true; parentUid: string };

type InvitePrecheck =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; role?: string }
  | { kind: 'already_used'; role?: string }
  | { kind: 'expired' }
  | { kind: 'not_found' };

function isInviteAlreadyAcceptedError(err: unknown): boolean {
  const msg =
    err instanceof FirebaseError
      ? err.message
      : err instanceof Error
        ? err.message
        : '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('already been accepted') ||
    lower.includes('invite token already used')
  );
}

function webInviteRole(role?: string): boolean {
  return role === 'principal' || role === 'super_admin';
}

function MobileAppStoreLinks() {
  const linkClass =
    'flex w-full justify-center rounded-xl border border-primary-200 bg-primary-50/90 py-3 text-sm font-bold text-primary-800 shadow-sm transition hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/35 dark:text-primary-200 dark:hover:bg-primary-900/55 sm:flex-1';
  return (
    <div className="mt-5 w-full flex flex-col gap-2 sm:flex-row sm:gap-3">
      <a
        href={MOBILE_APP_IOS_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Download on App Store
      </a>
      <a
        href={MOBILE_APP_PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Get it on Google Play
      </a>
    </div>
  );
}

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [invitePrecheck, setInvitePrecheck] = useState<InvitePrecheck>({ kind: 'idle' });
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [appOnlyRole, setAppOnlyRole] = useState<'teacher' | 'parent' | null>(null);

  useEffect(() => {
    if (!token) {
      setInvitePrecheck({ kind: 'ok' });
      return;
    }
    setInvitePrecheck({ kind: 'loading' });
    let cancelled = false;
    (async () => {
      try {
        const fn = httpsCallable<{ token: string }, PeekInviteResponse>(getFunctions(app), 'peekInviteToken');
        const res = await fn({ token });
        if (cancelled) return;
        const d = res.data;
        if (d.status === 'used') setInvitePrecheck({ kind: 'already_used', role: d.role });
        else if (d.status === 'expired') setInvitePrecheck({ kind: 'expired' });
        else if (d.status === 'not_found') setInvitePrecheck({ kind: 'not_found' });
        else setInvitePrecheck({ kind: 'ok', role: d.role });
      } catch {
        if (!cancelled) setInvitePrecheck({ kind: 'ok' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Missing invite token.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const fn = httpsCallable<
        { token: string; password: string; displayName?: string },
        AcceptInviteResponse
      >(getFunctions(app), 'acceptInviteToken');
      const res = await fn({ token, password, displayName: displayName.trim() || undefined });
      const payload = res.data as AcceptInviteResponse;

      if ('principalUid' in payload && payload.principalUid) {
        await signInWithCustomToken(auth, payload.customToken);
        setDone(true);
        router.replace('/principal');
        return;
      }
      if ('superAdminUid' in payload && payload.superAdminUid) {
        await signInWithCustomToken(auth, payload.customToken);
        setDone(true);
        router.replace('/admin');
        return;
      }
      if ('teacherUid' in payload) {
        setAppOnlyRole('teacher');
        setDone(true);
        return;
      }
      if ('parentUid' in payload) {
        setAppOnlyRole('parent');
        setDone(true);
      }
    } catch (err: unknown) {
      if (isInviteAlreadyAcceptedError(err)) {
        setInvitePrecheck((prev) => ({
          kind: 'already_used',
          role: prev.kind === 'ok' ? prev.role : undefined,
        }));
        return;
      }
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to accept invite';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const shellCardClass =
    'rounded-card-lg border-2 border-primary-200/50 bg-white/95 p-8 shadow-card-raised backdrop-blur-sm dark:border-primary-800/50 dark:bg-slate-800/95';

  const alreadyUsedRole = invitePrecheck.kind === 'already_used' ? invitePrecheck.role : undefined;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-warm-100 via-primary-100/70 to-accent-100/80 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-pattern-dots opacity-40 dark:opacity-20" aria-hidden />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-0 w-full max-w-sm animate-fade-in-up">
        {invitePrecheck.kind === 'loading' ? (
          <div className={shellCardClass}>
            <div className="mb-4 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 shadow-lg shadow-primary-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-slate-800">
                  <HeartIcon size={24} className="text-primary-600 dark:text-primary-400 animate-pulse" aria-hidden />
                </div>
              </div>
              <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">Checking your invite…</p>
            </div>
          </div>
        ) : invitePrecheck.kind === 'already_used' ? (
          <div className={shellCardClass}>
            <div className="mb-4 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80 dark:bg-slate-600/50 p-0.5 shadow-inner">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-slate-800">
                  <HeartIcon size={24} className="text-slate-500 dark:text-slate-400" aria-hidden />
                </div>
              </div>
              <h1 className="mt-5 text-center font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className="text-slate-800 dark:text-slate-100">This invite was already accepted</span>
              </h1>
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {webInviteRole(alreadyUsedRole)
                ? 'Sign in on the web with the email address from your invite and the password you chose when you first accepted.'
                : alreadyUsedRole === 'teacher' || alreadyUsedRole === 'parent'
                  ? 'Sign in on the My Little Moments mobile app with the email address from your invite and the password you chose when you first accepted.'
                  : 'This link has already been used. Sign in with the email address from your invite and the password you set when you accepted.'}
            </p>
            {!webInviteRole(alreadyUsedRole) ? <MobileAppStoreLinks /> : null}
            {webInviteRole(alreadyUsedRole) ? (
              <Link
                href="/login"
                className="relative mt-6 flex w-full justify-center overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5"
              >
                Go to sign in
              </Link>
            ) : (
              <>
                {alreadyUsedRole !== 'teacher' && alreadyUsedRole !== 'parent' && (
                  <Link
                    href="/login"
                    className="relative mt-6 flex w-full justify-center overflow-hidden rounded-xl border border-slate-200 bg-white py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Web sign-in (principals &amp; admins)
                  </Link>
                )}
                {(alreadyUsedRole === 'teacher' || alreadyUsedRole === 'parent') && (
                  <Link
                    href="/login"
                    className="relative mt-6 flex w-full justify-center overflow-hidden rounded-xl border border-slate-200 bg-white py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Web sign-in (principals only)
                  </Link>
                )}
              </>
            )}
          </div>
        ) : invitePrecheck.kind === 'expired' ? (
          <div className={shellCardClass}>
            <h1 className="text-center font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">
              This invite has expired
            </h1>
            <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
              Ask your school or an administrator to send a new invitation.
            </p>
          </div>
        ) : invitePrecheck.kind === 'not_found' ? (
          <div className={shellCardClass}>
            <h1 className="text-center font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Invite not found
            </h1>
            <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300">
              This link may be invalid or no longer available. Request a new invite if you need access.
            </p>
          </div>
        ) : appOnlyRole ? (
          <div className={shellCardClass}>
            <div className="mb-4 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 shadow-lg shadow-primary-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-slate-800">
                  <HeartIcon size={24} className="text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
              </div>
              <h1 className="mt-5 text-center font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className="text-gradient-warm">You&apos;re ready</span>
              </h1>
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {appOnlyRole === 'teacher'
                ? 'Your teacher account is active. Use the My Little Moments mobile app to sign in with the email address from your invite and the password you just chose.'
                : 'Your parent account is linked. Use the My Little Moments mobile app to sign in with the email address from your invite and the password you just chose.'}
            </p>
            <MobileAppStoreLinks />
            <Link
              href="/login"
              className="relative mt-6 flex w-full justify-center overflow-hidden rounded-xl border border-slate-200 bg-white py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Web sign-in (principals only)
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className={`${shellCardClass} transition-all duration-300`} noValidate>
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 shadow-lg shadow-primary-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-slate-800">
                  <HeartIcon size={24} className="text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
              </div>
              <h1 className="mt-5 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className="text-gradient-warm">Accept invite</span>
              </h1>
              <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
                Set your account details to finish onboarding.
              </p>
            </div>

            {!token && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800">
                This invite link is missing a token.
              </p>
            )}

            <div className="space-y-4 mt-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-base"
                  placeholder="e.g. Jane Smith"
                  autoComplete="name"
                  disabled={submitting || done || !token}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Set a password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  placeholder="Min 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  disabled={submitting || done || !token}
                />
              </div>
            </div>

            {error && (
              <p
                className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || done || !token}
              className="relative mt-6 w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 dark:focus:ring-offset-slate-900"
            >
              {submitting ? 'Setting up…' : done ? 'Done' : 'Accept invite'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
