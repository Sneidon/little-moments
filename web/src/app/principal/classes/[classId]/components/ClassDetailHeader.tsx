import Link from 'next/link';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';

export interface ClassDetailHeaderProps {
  classRoom: ClassRoom;
  assignedTeacherName: string;
  childrenCount: number;
}

export function ClassDetailHeader({
  classRoom,
  assignedTeacherName,
  childrenCount,
}: ClassDetailHeaderProps) {
  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/principal/classes"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Back to classes
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {formatClassDisplay(classRoom)}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Assigned teacher: {assignedTeacherName}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {childrenCount} child{childrenCount !== 1 ? 'ren' : ''} in this class
        </p>
      </div>
    </>
  );
}
