import Link from 'next/link';
import type { Child } from 'shared/types';
import { formatGenderLabel } from '@/lib/formatGender';

type Props = {
  childList: Child[];
  classDisplay: (classId: string) => string;
  hrefFor: (child: Child) => string;
  showStatus?: boolean;
  showGender?: boolean;
};

const TH = 'px-4 py-3 font-semibold text-slate-700 dark:text-slate-200';
const TD = 'px-4 py-3 text-slate-600 dark:text-slate-300';

function EnrollmentBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
      Enrolled
    </span>
  ) : (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
      Left school
    </span>
  );
}

function AllergyChips({ allergies }: { allergies?: string[] }) {
  if (!allergies?.length) return <span className="text-slate-500 dark:text-slate-400">—</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" role="list">
      {allergies.map((a, idx) => (
        <li key={idx}>
          <span className="inline-flex rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
            {a.trim()}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ChildrenTable({ childList, classDisplay, hrefFor, showStatus, showGender }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead className="bg-slate-50/80 dark:bg-slate-700">
          <tr>
            <th className={TH}>Name</th>
            {showStatus && <th className={TH}>Status</th>}
            <th className={TH}>Preferred</th>
            <th className={TH}>DOB</th>
            {showGender && <th className={TH}>Gender</th>}
            <th className={TH}>Class</th>
            <th className={TH}>Allergies</th>
            <th className={TH}>Emergency</th>
          </tr>
        </thead>
        <tbody>
          {childList.map((c) => (
            <tr
              key={c.id}
              className={`border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50 ${
                showStatus && c.isActive === false ? 'opacity-70' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                <Link
                  href={hrefFor(c)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              {showStatus && (
                <td className="px-4 py-3">
                  <EnrollmentBadge active={c.isActive !== false} />
                </td>
              )}
              <td className={TD}>{c.preferredName ?? '—'}</td>
              <td className={TD}>{c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}</td>
              {showGender && <td className={TD}>{formatGenderLabel(c.gender)}</td>}
              <td className={TD}>{c.classId ? classDisplay(c.classId) : '—'}</td>
              <td className="px-4 py-3">
                <AllergyChips allergies={c.allergies} />
              </td>
              <td className={TD}>
                {c.emergencyContactName || c.emergencyContact ? (
                  <span title={c.emergencyContact ?? ''}>{c.emergencyContactName ?? c.emergencyContact ?? '—'}</span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
