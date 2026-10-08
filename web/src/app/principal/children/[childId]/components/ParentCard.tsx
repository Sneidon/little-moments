import Link from 'next/link';
import type { UserProfile } from 'shared/types';
import { IconMail, IconPhone, IconUser } from '@/components/icons/AdminIcons';
import { getInitials } from 'shared/format';

type Props = {
  parent: UserProfile;
  readOnly: boolean;
  profileHref?: string;
  removing: boolean;
  isRemovingThis: boolean;
  onEdit?: (p: UserProfile) => void;
  onRemove?: (p: UserProfile) => void;
};

const LINK = 'text-primary-600 dark:text-primary-400 hover:underline';

function ContactLines({ parent: p }: { parent: UserProfile }) {
  return (
    <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-300">
      <span className="flex items-center gap-2">
        <IconMail className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <a href={`mailto:${p.email}`} className={`${LINK} truncate`}>
          {p.email}
        </a>
      </span>
      {p.phone ? (
        <span className="flex items-center gap-2">
          <IconPhone className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <a href={`tel:${p.phone}`} className={LINK}>
            {p.phone}
          </a>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <IconPhone className="h-4 w-4 shrink-0" />
          No phone
        </span>
      )}
    </div>
  );
}

export function ParentCard({ parent: p, readOnly, profileHref, removing, isRemovingThis, onEdit, onRemove }: Props) {
  const active = p.isActive !== false;
  return (
    <li className="flex flex-wrap items-start gap-4 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-4">
      <div className="flex shrink-0 items-center justify-center h-11 w-11 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold">
        {p.photoURL ? <img src={p.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" /> : getInitials(p.displayName, p.email)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <ContactLines parent={p} />
      </div>
      {!readOnly && (onEdit || profileHref) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {profileHref && (
            <Link href={profileHref} className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
              <IconUser className="h-4 w-4" />
              View profile
            </Link>
          )}
          {onEdit && (
            <button type="button" onClick={() => onEdit(p)} disabled={removing} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">
              Edit
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(p)}
              disabled={removing}
              className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {isRemovingThis ? 'Removing…' : 'Remove from child'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
