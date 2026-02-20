'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { HeartIcon } from '@/components/HeartIcon';
import { LoadingScreen } from '@/components/LoadingScreen';

const nav = [
  { href: '/principal', label: 'Dashboard' },
  { href: '/principal/children', label: 'Children' },
  { href: '/principal/classes', label: 'Classes' },
  { href: '/principal/staff', label: 'Staff' },
  { href: '/principal/reports', label: 'Reports' },
  { href: '/principal/announcements', label: 'Announcements' },
  { href: '/principal/events', label: 'Events' },
  { href: '/principal/food-menus', label: 'Food menus' },
  { href: '/principal/settings', label: 'School settings' },
];

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace('/login');
      return;
    }
    if (profile.role !== 'principal') {
      router.replace(profile.role === 'super_admin' ? '/admin' : '/login');
      return;
    }
  }, [user, profile, loading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (!user || !profile) return null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-card
          transition-transform duration-200 ease-out lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <HeartIcon size={28} className="shrink-0 text-primary-600" aria-hidden />
            <div className="min-w-0">
              <span className="block truncate font-semibold text-slate-800">My Little Moments</span>
              <span className="block text-[10px] text-slate-500">Principal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Main">
          <div className="flex flex-col gap-0.5">
            {nav.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/principal' && (pathname?.startsWith(href) ?? false));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-slate-200 p-2">
          <p className="truncate px-3 py-2 text-xs text-slate-500" title={profile.displayName ?? ''}>
            {profile.displayName}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-500 lg:sr-only">Principal</span>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
