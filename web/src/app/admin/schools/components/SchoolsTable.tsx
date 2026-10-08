import Link from 'next/link';
import type { School } from 'shared/types';

const TH = 'px-4 py-3 font-medium text-slate-700 dark:text-slate-200';
const TD = 'px-4 py-3 text-slate-600 dark:text-slate-300';

function SubscriptionBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
      }`}
    >
      {status}
    </span>
  );
}

export function SchoolsTable({ schools, onEdit }: { schools: School[]; onEdit: (school: School) => void }) {
  return (
    <div className="overflow-hidden">
      <table className="data-table">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            {['Name', 'Onboarding', 'Subscription', 'Address', 'Contact', 'Website'].map((h) => (
              <th key={h} className={TH}>
                {h}
              </th>
            ))}
            <th className={`w-0 text-right ${TH}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schools.map((s) => (
            <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                <Link href={`/admin/schools/${s.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className={TD}>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {(s.status ?? '—') as string}
                </span>
              </td>
              <td className="px-4 py-3">
                <SubscriptionBadge status={s.subscriptionStatus ?? 'active'} />
              </td>
              <td className={`${TD} max-w-[180px] truncate`} title={s.address}>
                {s.address ?? '—'}
              </td>
              <td className={TD}>
                <span title={[s.contactEmail, s.contactPhone].filter(Boolean).join(' · ')}>{s.contactEmail ?? s.contactPhone ?? '—'}</span>
              </td>
              <td className={TD}>
                {s.website ? (
                  <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[120px] block">
                    {s.website}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {schools.length === 0 && <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>}
    </div>
  );
}
