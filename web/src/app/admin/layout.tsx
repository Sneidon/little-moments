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
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/schools', label: 'Schools' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/usage', label: 'Usage & analytics' },
];

export default function AdminLayout({
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
    if (profile.role !== 'super_admin') {
      router.replace(profile.role === 'principal' ? '/principal' : '/login');
      return;
    }
  }, [user, profile, loading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return <LoadingScreen message="Loading…" variant="slate" />;
  }

  if (!user || !profile) return null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-700 bg-slate-800 shadow-xl
          transition-transform duration-200 ease-out lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <HeartIcon size={28} className="shrink-0 text-white" aria-hidden />
            <div className="min-w-0">
              <span className="block truncate font-semibold text-white">My Little Moments</span>
              <span className="block text-[10px] text-slate-400">Super Admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
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
              const isActive = pathname === href || (href !== '/admin' && (pathname?.startsWith(href) ?? false));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-600 text-white ring-1 ring-slate-500'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-slate-700 p-2">
          <p className="truncate px-3 py-2 text-xs text-slate-400" title={profile.displayName ?? ''}>
            {profile.displayName}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
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
          <span className="text-sm font-medium text-slate-500 lg:sr-only">Super Admin</span>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
