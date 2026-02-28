'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminSchoolOverviewPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, teachers, classes, children, loading, error, refetch } = useAdminSchoolDetail(schoolId);

  if (loading) {
    return <LoadingScreen message="Loading school…" variant="primary" />;
  }

  if (error || !school) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/schools"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">
            {error ?? 'School not found.'}
          </p>
        </div>
      </div>
    );
  }

  const subscriptionStatus = school.subscriptionStatus ?? 'active';

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/schools"
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
          >
            ← Back to schools
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            {school.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Overview
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary shrink-0"
        >
          Refresh
        </button>
      </div>

      {/* School information */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
          School information
        </h2>
        <div className="card overflow-hidden p-6">
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
        </div>
      </section>

      {/* Links to Teachers, Classes, Children, Reports */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href={`/admin/schools/${schoolId}/teachers`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{teachers.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Teachers</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Staff and principals</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/classes`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{classes.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Classes</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rooms and groups</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/children`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{children.length}</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Children</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enrolled children</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/reports`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">—</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Reports</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily activity logs</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/usage`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">—</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Usage & analytics</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Activity overview</p>
        </Link>
        <Link
          href={`/admin/schools/${schoolId}/settings`}
          className="card-hover block p-6"
        >
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">⚙</p>
          <h3 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Configure school</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enable/disable features</p>
        </Link>
      </div>
    </div>
  );
}
