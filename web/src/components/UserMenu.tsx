'use client';

import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import type { UserProfile } from 'shared/types';
import { getWebEligibleRoles } from '@/lib/roles';

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
  const webRoles = getWebEligibleRoles(profile);
  const showSwitchRole = webRoles.length > 1;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full py-1 pr-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 sm:gap-2.5 sm:rounded-xl sm:py-1.5 sm:pl-1.5 sm:pr-3 ${
          open ? 'bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-sm font-semibold text-primary-700 dark:from-primary-800/60 dark:to-accent-800/40 dark:text-primary-200"
            aria-hidden
          >
            {getInitials(profile)}
          </span>
        )}
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
          {profile.displayName || profile.email}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out dark:text-slate-400 ${open ? 'rotate-180' : ''}`}
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
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-3 shadow-xl animate-fade-in dark:border-slate-600 dark:bg-slate-800"
          role="menu"
        >
          <div className="px-4 pb-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Account
            </p>
            <div className="flex items-center gap-3">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-sm font-semibold text-primary-700 dark:from-primary-800/60 dark:to-accent-800/40 dark:text-primary-200"
                  aria-hidden
                >
                  {getInitials(profile)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {profile.displayName || 'No name'}
                </p>
                {profile.email && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-0.5">
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700/50 dark:focus:bg-slate-700/50"
              role="menuitem"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                <svg className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <span>
                <span className="block font-medium">Update profile</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Name and photo</span>
              </span>
            </Link>
            {showSwitchRole && (
              <Link
                href="/select-role"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700/50 dark:focus:bg-slate-700/50"
                role="menuitem"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                  <svg className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </span>
                <span>
                  <span className="block font-medium">Switch portal</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Choose another role</span>
                </span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none dark:text-slate-300 dark:hover:bg-red-950/20 dark:hover:text-red-300"
              role="menuitem"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
