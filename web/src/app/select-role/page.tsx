'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  getWebEligibleRoles,
  portalPathForRole,
  roleDisplayLabel,
  selectActiveRole,
} from '@/lib/roles';
import type { UserRole } from 'shared/types';

export default function SelectRolePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [choosing, setChoosing] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  const eligible = getWebEligibleRoles(profile);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace('/login');
      return;
    }
    if (eligible.length === 0) {
      void signOut(auth);
      router.replace('/login');
      return;
    }
    if (eligible.length === 1) {
      const only = eligible[0];
      const path = portalPathForRole(only);
      if (!path) return;
      if (profile.role === only) {
        router.replace(path);
        return;
      }
      void (async () => {
        try {
          await selectActiveRole(only);
          await refreshProfile();
          router.replace(path);
        } catch {
          router.replace('/login');
        }
      })();
    }
  }, [user, profile, loading, eligible.length, router, refreshProfile, profile?.role]);

  const handleChoose = async (role: UserRole) => {
    setError('');
    setChoosing(role);
    try {
      await selectActiveRole(role);
      await refreshProfile();
      const path = portalPathForRole(role);
      router.replace(path || '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not switch role.');
      setChoosing(null);
    }
  };

  if (loading || !user || !profile) {
    return <LoadingScreen message="Loading…" />;
  }

  if (eligible.length <= 1) {
    return <LoadingScreen message="Opening your portal…" />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-warm-100 via-primary-100/70 to-accent-100/80 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-pattern-dots opacity-40 dark:opacity-20" aria-hidden />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-0 w-full max-w-md animate-fade-in-up">
        <div className="rounded-card-lg border-2 border-primary-200/50 bg-white/95 p-8 shadow-card-raised backdrop-blur-sm dark:border-primary-800/50 dark:bg-slate-800/95">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-lg shadow-primary-500/25">
              <AppLogo sizes="56px" priority />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Choose a portal
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This account has more than one role. Pick where you want to continue.
            </p>
          </div>
          <div className="space-y-3">
            {eligible.map((role) => (
              <button
                key={role}
                type="button"
                disabled={!!choosing}
                onClick={() => void handleChoose(role)}
                className="flex w-full items-center justify-between rounded-xl border-2 border-primary-200/60 bg-primary-50/50 px-5 py-4 text-left transition hover:border-primary-400 hover:bg-primary-50 disabled:opacity-60 dark:border-primary-800/50 dark:bg-slate-900/40 dark:hover:border-primary-500"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {roleDisplayLabel(role)}
                </span>
                <span className="text-sm text-primary-600 dark:text-primary-300">
                  {choosing === role ? 'Opening…' : 'Continue'}
                </span>
              </button>
            ))}
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="mt-6 w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => void signOut(auth).then(() => router.push('/login'))}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
