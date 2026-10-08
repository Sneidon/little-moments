'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHero } from '@/components/ui';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { DangerZone } from './components/DangerZone';
import { SchoolInfoCard } from './components/SchoolInfoCard';
import { SchoolSectionLinks } from './components/SchoolSectionLinks';
import { useSchoolDangerZone } from './useSchoolDangerZone';

const HEADING = 'mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200';

export default function AdminSchoolOverviewPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, teachers, classes, children, loading, error, refetch } = useAdminSchoolDetail(schoolId);
  const zone = useSchoolDangerZone(schoolId, school, refetch);

  if (loading) return <LoadingScreen message="Loading school…" variant="primary" />;

  if (error || !school || !schoolId) {
    return (
      <div className="animate-fade-in">
        <Link href="/admin/schools" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error ?? 'School not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        backHref="/admin/schools"
        backLabel="Schools"
        title={<span className="text-gradient-warm">{school.name}</span>}
        subtitle="Overview"
        actions={
          <button type="button" onClick={() => refetch()} className="btn-secondary shrink-0">
            Refresh
          </button>
        }
      />
      <section className="mb-8">
        <h2 className={HEADING}>School information</h2>
        <SchoolInfoCard school={school} />
      </section>
      <h2 className={HEADING}>Details</h2>
      <SchoolSectionLinks schoolId={schoolId} teachers={teachers.length} classes={classes.length} children={children.length} />
      <DangerZone zone={zone} school={school} />
    </div>
  );
}
