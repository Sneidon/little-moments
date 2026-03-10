'use client';

import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import type { UserProfile } from 'shared/types';

export interface UserMenuProps {
  profile: UserProfile;
  profileHref: string;
  onSignOut: () => void;
}

function getInitials(profile: UserProfile): string {
  const name = (profile.displayName || profile.email || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserMenu({ profile, profileHref, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-200"
            aria-hidden
          >
            {getInitials(profile)}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
          {profile.displayName || profile.email}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition dark:text-slate-400 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-800"
          role="menu"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {profile.displayName || 'No name'}
            </p>
            {profile.email && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
            )}
          </div>
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Update profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            role="menuitem"
          >
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
