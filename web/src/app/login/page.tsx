'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { HeartIcon } from '@/components/HeartIcon';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'principal') router.replace('/principal');
    else if (profile?.role === 'super_admin') router.replace('/admin');
  }, [profile?.role, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-warm-100 via-primary-100/70 to-accent-100/80 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-pattern-dots opacity-40 dark:opacity-20" aria-hidden />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary-300/50 blur-3xl dark:bg-primary-600/20" aria-hidden />
      <div className="absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-accent-300/50 blur-3xl dark:bg-accent-600/20" aria-hidden />
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warm-200/60 blur-3xl dark:bg-warm-600/10" aria-hidden />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-0 w-full max-w-sm animate-fade-in-up">
        <form
          onSubmit={handleLogin}
          className="rounded-card-lg border-2 border-primary-200/50 bg-white/95 p-8 shadow-card-raised backdrop-blur-sm dark:border-primary-800/50 dark:bg-slate-800/95 focus-within:border-primary-400 focus-within:shadow-glow-sm dark:focus-within:border-primary-500 dark:focus-within:shadow-glow-sm transition-all duration-300 dark:focus-within:ring-2 dark:focus-within:ring-primary-500/30"
          noValidate
        >
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-0.5 shadow-lg shadow-primary-500/25 dark:shadow-primary-600/30">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-slate-800">
                <HeartIcon size={28} className="text-primary-600 dark:text-primary-400" aria-hidden />
              </div>
            </div>
            <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-gradient-warm">My Little Moments</span>
            </h1>
            <p className="mt-3 rounded-full border border-warm-200 bg-warm-100 px-4 py-1.5 text-xs font-bold text-warm-800 dark:border-warm-800 dark:bg-warm-900/40 dark:text-warm-200">
              Daycare admin — Principals & super admins
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@school.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                autoComplete="email"
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                autoComplete="current-password"
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
          </div>
          {error && (
            <p
              id="login-error"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="relative mt-6 w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 dark:focus:ring-offset-slate-900"
          >
            <span className="relative z-10">{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            For daycare and school staff only.
          </p>
        </form>
      </div>
    </div>
  );
}
