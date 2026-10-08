import Link from 'next/link';

type Props = { schoolId: string; teachers: number; classes: number; children: number };

export function SchoolSectionLinks({ schoolId, teachers, classes, children }: Props) {
  const cards = [
    { path: 'teachers', value: teachers, title: 'Teachers', hint: 'Staff and principals' },
    { path: 'classes', value: classes, title: 'Classes', hint: 'Rooms and groups' },
    { path: 'children', value: children, title: 'Children', hint: 'Enrolled children' },
    { path: 'reports', value: '—', title: 'Reports', hint: 'Daily activity logs' },
    { path: 'usage', value: '—', title: 'Usage & analytics', hint: 'Activity overview' },
    { path: 'settings', value: '⚙', title: 'Configure school', hint: 'Enable/disable features' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Link key={c.path} href={`/admin/schools/${schoolId}/${c.path}`} className="card-hover block p-6">
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{c.value}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{c.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.hint}</p>
        </Link>
      ))}
    </div>
  );
}
