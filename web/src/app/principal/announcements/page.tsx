'use client';

import { useAuth } from '@/context/AuthContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAnnouncementForm } from '@/hooks/useAnnouncementForm';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { AnnouncementForm } from '@/components/AnnouncementForm';

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const { announcements } = useAnnouncements(schoolId);
  const form = useAnnouncementForm({
    schoolId,
    createdBy: profile?.uid ?? '',
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Post updates for parents and staff
        </p>
      </div>

      <AnnouncementForm form={form} />

      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
        Recent announcements
      </h2>
      <div className="space-y-4">
        {announcements.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} />
        ))}
      </div>
      {announcements.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No announcements yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Post one above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
