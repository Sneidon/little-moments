import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';
import { MOBILE_APP_IOS_APP_STORE_URL, MOBILE_APP_PLAY_STORE_URL } from '@/config/mobileApp';

export const SHELL_CARD =
  'rounded-card-lg border-2 border-primary-200/50 bg-white/95 p-8 shadow-card-raised backdrop-blur-sm dark:border-primary-800/50 dark:bg-slate-800/95';
const SECONDARY_LINK =
  'relative mt-6 flex w-full justify-center overflow-hidden rounded-xl border border-slate-200 bg-white py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
const BODY = 'text-center text-sm text-slate-600 dark:text-slate-300';

export function isWebRole(role?: string) {
  return role === 'principal' || role === 'super_admin';
}

const isAppRole = (role?: string) => role === 'teacher' || role === 'parent';

export function LogoHeader({ title, dim, pulse, children }: { title?: React.ReactNode; dim?: boolean; pulse?: boolean; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col items-center">
      <div
        className={`relative h-14 w-14 overflow-hidden rounded-2xl ${dim ? 'opacity-70 shadow-inner' : 'shadow-lg shadow-primary-500/25'} ${pulse ? 'animate-pulse' : ''}`}
      >
        <AppLogo sizes="56px" />
      </div>
      {title ? <h1 className="mt-5 text-center font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1> : null}
      {children}
    </div>
  );
}

function MobileAppStoreLinks() {
  const linkClass =
    'flex w-full justify-center rounded-xl border border-primary-200 bg-primary-50/90 py-3 text-sm font-bold text-primary-800 shadow-sm transition hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/35 dark:text-primary-200 dark:hover:bg-primary-900/55 sm:flex-1';
  return (
    <div className="mt-5 w-full flex flex-col gap-2 sm:flex-row sm:gap-3">
      <a href={MOBILE_APP_IOS_APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Download on App Store
      </a>
      <a href={MOBILE_APP_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Get it on Google Play
      </a>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className={SHELL_CARD}>
      <LogoHeader pulse>
        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">Checking your invite…</p>
      </LogoHeader>
    </div>
  );
}

export function MessageCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={SHELL_CARD}>
      <h1 className="text-center font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h1>
      <p className={`mt-3 ${BODY}`}>{body}</p>
    </div>
  );
}

function alreadyUsedText(role?: string) {
  if (isWebRole(role)) return 'Sign in on the web with the email address from your invite and your usual password.';
  if (isAppRole(role)) return 'Sign in on the My Little Moments mobile app with the email address from your invite and your usual password.';
  return 'This link has already been used. Sign in with the email address from your invite.';
}

export function AlreadyUsedCard({ role }: { role?: string }) {
  return (
    <div className={SHELL_CARD}>
      <LogoHeader dim title={<span className="text-slate-800 dark:text-slate-100">This invite was already accepted</span>} />
      <p className={BODY}>{alreadyUsedText(role)}</p>
      {isWebRole(role) ? (
        <Link
          href="/login"
          className="relative mt-6 flex w-full justify-center overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/30 transition hover:-translate-y-0.5"
        >
          Go to sign in
        </Link>
      ) : (
        <>
          <MobileAppStoreLinks />
          <Link href="/login" className={SECONDARY_LINK}>
            {isAppRole(role) ? 'Web sign-in (principals only)' : <>Web sign-in (principals &amp; admins)</>}
          </Link>
        </>
      )}
    </div>
  );
}

function appReadyText(role: 'teacher' | 'parent', existing: boolean) {
  if (existing) {
    return `${role === 'teacher' ? 'Teacher' : 'Parent'} access is on your existing account. Sign in on the My Little Moments mobile app with your usual email and password.`;
  }
  return role === 'teacher'
    ? 'Your teacher account is active. Use the My Little Moments mobile app to sign in with the email address from your invite and the password you just chose.'
    : 'Your parent account is linked. Use the My Little Moments mobile app to sign in with the email address from your invite and the password you just chose.';
}

export function AppReadyCard({ role, existing }: { role: 'teacher' | 'parent'; existing: boolean }) {
  return (
    <div className={SHELL_CARD}>
      <LogoHeader title={<span className="text-gradient-warm">You&apos;re ready</span>} />
      <p className={BODY}>{appReadyText(role, existing)}</p>
      <MobileAppStoreLinks />
      <Link href="/login" className={SECONDARY_LINK}>
        Web sign-in (principals only)
      </Link>
    </div>
  );
}
