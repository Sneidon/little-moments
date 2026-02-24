'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { formatClassDisplay } from '@/lib/formatClass';
import { getTeacherDisplayName } from '@/lib/teachers';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ClassesTable } from '@/app/principal/classes/components';

export default function AdminSchoolClassesPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, teachers, classes, loading, error } = useAdminSchoolDetail(schoolId);

  const teacherName = (uid: string) => getTeacherDisplayName(uid, teachers);

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
          Classes
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Rooms and groups at {school.name}
        </p>
      </div>

      <ClassesTable
        classes={classes}
        teacherDisplayName={teacherName}
        classLinkHref={schoolId ? (c) => `/admin/schools/${schoolId}/classes/${c.id}` : (c) => `/admin/schools/classes/${c.id}`}
        onEdit={undefined}
      />
    </div>
  );
}
