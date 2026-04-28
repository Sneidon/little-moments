'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { app, auth } from '@/config/firebase';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeartIcon } from '@/components/HeartIcon';

type AcceptInviteResponse = { ok: true; principalUid: string; schoolId: string; customToken: string };

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
      const fn = httpsCallable<{ token: string; password: string; displayName?: string }, AcceptInviteResponse>(
        getFunctions(app),
        'acceptInviteToken'
      );
      const res = await fn({ token, password, displayName: displayName.trim() || undefined });
      await signInWithCustomToken(auth, res.data.customToken);
      setDone(true);
      router.replace('/principal');
    } catch (err: unknown) {
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-warm-100 via-primary-100/70 to-accent-100/80 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-pattern-dots opacity-40 dark:opacity-20" aria-hidden />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-0 w-full max-w-sm animate-fade-in-up">
        <form
          onSubmit={onSubmit}
          className="rounded-card-lg border-2 border-primary-200/50 bg-white/95 p-8 shadow-card-raised backdrop-blur-sm dark:border-primary-800/50 dark:bg-slate-800/95 transition-all duration-300"
          noValidate
        >
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-base"
                placeholder="e.g. Jane Smith"
                autoComplete="name"
                disabled={submitting || done}
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
                disabled={submitting || done}
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
      </div>
    </div>
  );
}

