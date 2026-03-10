import Link from 'next/link';
import type { Child } from 'shared/types';
import { SectionCard } from '@/components/ui';
import { IconChild, IconCalendar } from '@/components/icons/AdminIcons';

function getInitials(child: Child): string {
  const name = (child.name ?? '').trim();
  if (name.length >= 2) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (child.preferredName?.trim()) return child.preferredName.trim().slice(0, 2).toUpperCase();
  return name ? name[0].toUpperCase() : '?';
}

export interface ChildrenInClassListProps {
  children: Child[];
  /** Link href for each child. Default: /principal/children/{id} */
  childLinkHref?: (child: Child) => string;
}

export function ChildrenInClassList({ children, childLinkHref = (child) => `/principal/children/${child.id}` }: ChildrenInClassListProps) {
  return (
    <SectionCard topBar="warm" padding="default" className="mt-8">
      <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Children in this class
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {children.length === 0
          ? 'No children assigned to this class yet.'
          : `${children.length} ${children.length === 1 ? 'child' : 'children'} in this class.`}
      </p>
      {children.length === 0 ? null : (
        <ul className="space-y-4">
          {children.map((child) => (
            <li
              key={child.id}
              className="flex flex-wrap items-start gap-4 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-4"
            >
              <div className="flex shrink-0 items-center justify-center h-11 w-11 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold">
                {getInitials(child)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={childLinkHref(child)}
                    className="font-semibold text-slate-800 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                  >
                    {child.name ?? '—'}
                  </Link>
                  {child.preferredName && (
                    <span className="text-slate-600 dark:text-slate-300">
                      “{child.preferredName}”
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                    {child.dateOfBirth
                      ? new Date(child.dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'No date of birth'}
                  </span>
                  {child.allergies?.length ? (
                    <span className="flex items-center gap-2">
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Allergies</span>
                      {(child.allergies as string[]).join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">
                      No allergies recorded
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0">
                <Link
                  href={childLinkHref(child)}
                  className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
                >
                  <IconChild className="h-4 w-4" aria-hidden />
                  View profile
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

    </SectionCard>
  );
}
