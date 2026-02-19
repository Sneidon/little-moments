'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { HeartIcon } from '@/components/HeartIcon';

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 flex-shrink-0 border-r border-slate-700 bg-slate-800 shadow-lg">
        <div className="flex h-14 items-center gap-2 border-b border-slate-700 px-4">
          <HeartIcon size={28} className="shrink-0 text-white" aria-label="Logo" />
          <div className="min-w-0">
            <span className="block truncate font-semibold text-white">My Little Moments</span>
            <span className="block text-[10px] text-slate-400">Super Admin</span>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/admin' && (pathname?.startsWith(href) ?? false));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-2">
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
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
