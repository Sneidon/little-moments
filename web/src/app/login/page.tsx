'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { HeartIcon } from '@/components/HeartIcon';

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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/40 to-slate-100 px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in-up">
        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft ring-1 ring-slate-900/5"
          noValidate
        >
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
              <HeartIcon size={32} className="text-primary-600" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-800">
              My Little Moments
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Admin sign in</p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full py-3"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-6 text-center text-xs text-slate-500">
            For principals and super admins only.
          </p>
        </form>
      </div>
    </div>
  );
}
