import Link from 'next/link';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';
import { SectionCard } from '@/components/ui';

export interface ClassesTableProps {
  classes: ClassRoom[];
  teacherDisplayName: (uid: string) => string;
  /** If provided, class name links here. Default: /principal/classes/{id} */
  classLinkHref?: (c: ClassRoom) => string;
  /** If provided, show Edit button. Omit for read-only (e.g. admin). */
  onEdit?: (c: ClassRoom) => void;
}

export function ClassesTable({
  classes,
  teacherDisplayName,
  classLinkHref = (c) => `/principal/classes/${c.id}`,
  onEdit,
}: ClassesTableProps) {
  return (
    <SectionCard topBar="accent" padding="none">
      <table className="data-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Assigned teacher</th>
            {onEdit != null && (
              <th className="w-0 text-right">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => (
            <tr key={c.id}>
              <td className="cell-main">
                <Link
                  href={classLinkHref(c)}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {formatClassDisplay(c)}
                </Link>
              </td>
              <td>
                {c.assignedTeacherId ? teacherDisplayName(c.assignedTeacherId) : '—'}
              </td>
              {onEdit != null && (
                <td className="whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {classes.length === 0 && (
        <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
          No classes yet. Add a class/room to organize children.
        </p>
      )}
    </SectionCard>
  );
}
