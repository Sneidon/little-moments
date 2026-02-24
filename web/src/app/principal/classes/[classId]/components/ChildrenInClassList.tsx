import Link from 'next/link';
import type { Child } from 'shared/types';

export interface ChildrenInClassListProps {
  children: Child[];
  /** Link href for each child. Default: /principal/children/{id} */
  childLinkHref?: (child: Child) => string;
}

export function ChildrenInClassList({ children, childLinkHref = (child) => `/principal/children/${child.id}` }: ChildrenInClassListProps) {
  return (
    <section className="mt-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
        Children in this class
      </h2>
      {children.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">
          No children assigned to this class yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {children.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 px-4 py-3"
            >
              <div>
                <Link
                  href={childLinkHref(child)}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {child.name}
                </Link>
                {child.preferredName && (
                  <span className="ml-2 text-slate-600 dark:text-slate-300">
                    ({child.preferredName})
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {child.dateOfBirth
                  ? new Date(child.dateOfBirth).toLocaleDateString()
                  : '—'}
                {child.allergies?.length
                  ? ` · ${child.allergies.length} allerg${child.allergies.length !== 1 ? 'ies' : 'y'}`
                  : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
