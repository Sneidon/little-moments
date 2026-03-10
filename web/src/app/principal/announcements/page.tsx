'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAnnouncementForm } from '@/hooks/useAnnouncementForm';
import { useClasses } from '@/hooks/useClasses';
import { AnnouncementForm } from '@/components/AnnouncementForm';
import { AnnouncementsTable } from '@/components/AnnouncementsTable';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { announcements, loading } = useAnnouncements(schoolId);
  const { classes } = useClasses(schoolId);
  const form = useAnnouncementForm({
    schoolId,
    createdBy: profile?.uid ?? '',
  });

  const classNamesMap = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes]
  );

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Announcements</span>}
        subtitle="Post updates for parents and staff"
        actions={
          !form.showForm ? (
            <button type="button" onClick={form.openFormForNew} className="btn-primary shrink-0">
              Add announcement
            </button>
          ) : undefined
        }
      />

      {form.showForm && <AnnouncementForm form={form} classes={classes} />}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton />
        </SectionCard>
      ) : (
        <AnnouncementsTable
          announcements={announcements}
          classNamesMap={classNamesMap}
          onEdit={form.openFormForEdit}
        />
      )}
    </div>
  );
}
