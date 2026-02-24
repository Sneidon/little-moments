'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminSchoolTeachersPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, teachers, loading, error } = useAdminSchoolDetail(schoolId);

  if (loading) {
    return <LoadingScreen message="Loading…" variant="primary" />;
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
          <p className="text-slate-600 dark:text-slate-300">{error ?? 'School not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/admin/schools/${schoolId}`}
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to {school.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Teachers
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Staff and principals at {school.name}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Role</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((u) => (
              <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {u.preferredName ?? u.displayName ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="capitalize text-slate-600 dark:text-slate-300">{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teachers.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
            No teachers or principals for this school.
          </p>
        )}
      </div>
    </div>
  );
}
