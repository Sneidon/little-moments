import { SectionCard } from '@/components/ui';
import type { School } from 'shared/types';

export function SchoolInfoCard({ school }: { school: School }) {
  const subscriptionStatus = school.subscriptionStatus ?? 'active';
  return (
    <SectionCard topBar="primary" padding="default">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Name</dt>
          <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{school.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Subscription</dt>
          <dd className="mt-0.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                subscriptionStatus === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
              }`}
            >
              {subscriptionStatus}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Lifecycle status</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{school.status ?? '—'}</dd>
        </div>
        {school.address && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Address</dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{school.address}</dd>
          </div>
        )}
        {school.contactEmail && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact email</dt>
            <dd className="mt-0.5">
              <a href={`mailto:${school.contactEmail}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                {school.contactEmail}
              </a>
            </dd>
          </div>
        )}
        {school.contactPhone && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact phone</dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{school.contactPhone}</dd>
          </div>
        )}
        {school.website && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Website</dt>
            <dd className="mt-0.5">
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">
                {school.website}
              </a>
            </dd>
          </div>
        )}
        {school.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Description</dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{school.description}</dd>
          </div>
        )}
      </dl>
    </SectionCard>
  );
}
