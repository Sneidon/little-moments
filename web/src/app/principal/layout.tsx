'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center border-b border-slate-200 px-4">
          <span className="font-semibold text-slate-800">Principal</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/principal' && (pathname?.startsWith(href) ?? false));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-2">
          <p className="truncate px-3 py-1 text-xs text-slate-500">{profile.displayName}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
