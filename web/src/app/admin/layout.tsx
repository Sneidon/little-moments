'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-slate-800">
        <div className="flex h-14 items-center border-b border-slate-700 px-4">
          <span className="font-semibold text-white">Super Admin</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/admin' && (pathname?.startsWith(href) ?? false));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
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
          <p className="truncate px-3 py-1 text-xs text-slate-400">{profile.displayName}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
    </div>
  );
}
