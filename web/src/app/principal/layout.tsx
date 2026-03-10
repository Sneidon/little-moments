'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { HeartIcon } from '@/components/HeartIcon';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import {
  IconDashboard,
  IconChild,
  IconClipboard,
  IconUsers,
  IconUser,
  IconMegaphone,
  IconCalendar,
  IconUtensils,
  IconFileText,
  IconSettings,
  IconHelp,
  IconMail,
} from '@/components/icons/AdminIcons';

const navSections: { title: string; links: { href: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    title: '',
    links: [{ href: '/principal', label: 'Home', Icon: IconDashboard }],
  },
  {
    title: 'People',
    links: [
      { href: '/principal/children', label: 'Children', Icon: IconChild },
      { href: '/principal/classes', label: 'Classes', Icon: IconClipboard },
      { href: '/principal/staff', label: 'Staff', Icon: IconUsers },
      { href: '/principal/parents', label: 'Parents', Icon: IconUser },
    ],
  },
  {
    title: 'Content & communication',
    links: [
      { href: '/principal/announcements', label: 'Announcements', Icon: IconMegaphone },
      { href: '/principal/events', label: 'Events', Icon: IconCalendar },
      { href: '/principal/food-menus', label: 'Meal options', Icon: IconUtensils },
    ],
  },
  {
    title: 'Reports & settings',
    links: [
      { href: '/principal/reports', label: 'Reports', Icon: IconFileText },
      { href: '/principal/settings', label: 'School settings', Icon: IconSettings },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/principal/faq', label: 'FAQ', Icon: IconHelp },
      { href: '/principal/support', label: 'Contact support', Icon: IconMail },
    ],
  },
];

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;
    let cancelled = false;
    getDoc(doc(db, 'schools', profile.schoolId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const name = (snap.data() as { name?: string }).name;
      if (name) setSchoolName(name);
    });
    return () => { cancelled = true; };
  }, [profile?.schoolId]);

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

  return (
    <div className="relative flex min-h-screen bg-warm-50 dark:bg-slate-900">
      <div className="fixed inset-0 z-0 bg-pattern-dots opacity-30 pointer-events-none dark:opacity-20" aria-hidden />
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:px-6 lg:left-6 lg:right-6 lg:rounded-b-card lg:border lg:border-t-0 lg:border-slate-200 lg:shadow-xl dark:lg:border-slate-700">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/principal" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/50 dark:to-accent-900/30">
              <HeartIcon size={18} className="text-primary-600 dark:text-primary-400" aria-hidden />
            </div>
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={schoolName ?? undefined}>
              {schoolName ?? 'My Little Moments'}
            </span>
          </Link>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300 lg:sr-only">
            Principal
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu
            profile={profile}
            profileHref="/principal/profile"
            onSignOut={handleSignOut}
          />
        </div>
      </header>
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm dark:bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-slate-200/80 bg-white shadow-xl
          dark:border-slate-700 dark:bg-slate-800/95
          transition-transform duration-250 ease-smooth
          lg:left-6 lg:bottom-4 lg:top-[calc(3.5rem+1rem)] lg:h-[calc(100vh-3.5rem-1rem-1rem)] lg:w-64 lg:max-w-none
          lg:rounded-card lg:shadow-xl lg:border lg:border-slate-200 dark:lg:border-slate-700
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-slate-200/80 px-3 py-2 pt-4 dark:border-slate-700 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:rounded-b-card lg:pt-3" aria-label="Main">
          <div className="flex flex-col gap-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.links.map(({ href, label, Icon }) => {
                    const isActive =
                      pathname === href ||
                      (href !== '/principal' && (pathname?.startsWith(href) ?? false));
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setSidebarOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 pl-4 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-100 to-primary-50/50 text-primary-700 ring-1 ring-primary-200 dark:from-primary-800/50 dark:to-primary-900/30 dark:text-primary-100 dark:ring-primary-500/50'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                        }`}
                      >
                        {isActive && <span className="nav-active-bar" aria-hidden />}
                        <Icon className="h-5 w-5 shrink-0 opacity-80" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col pt-14 lg:ml-[calc(16rem+1rem+0.5rem)]">
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
