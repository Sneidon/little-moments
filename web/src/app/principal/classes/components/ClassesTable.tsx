import Link from 'next/link';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';

export interface ClassesTableProps {
  classes: ClassRoom[];
  teacherDisplayName: (uid: string) => string;
  onEdit: (c: ClassRoom) => void;
}

export function ClassesTable({
  classes,
  teacherDisplayName,
  onEdit,
}: ClassesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Class</th>
            <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Assigned teacher</th>
            <th className="w-0 px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                <Link
                  href={`/principal/classes/${c.id}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {formatClassDisplay(c)}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {c.assignedTeacherId ? teacherDisplayName(c.assignedTeacherId) : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {classes.length === 0 && (
        <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
          No classes yet. Add a class/room to organize children.
        </p>
      )}
    </div>
  );
}
