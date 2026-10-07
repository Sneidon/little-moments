'use client';

import { PageHero, ExportMenu } from '@/components/ui';

export interface StaffPageHeaderProps {
  onExportPdf: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onInviteTeacher: () => void;
  onInviteSchoolAdmin: () => void;
  onAddTeacher: () => void;
}

export function StaffPageHeader({
  onExportPdf,
  onExportCsv,
  onExportExcel,
  onInviteTeacher,
  onInviteSchoolAdmin,
  onAddTeacher,
}: StaffPageHeaderProps) {

  return (
    <PageHero
      variant="full"
      title={<span className="text-gradient-warm">Staff & teachers</span>}
      subtitle="Teachers and school admins at your school. Assign from Classes; parents are on the Parents page."
      actions={
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <ExportMenu onCsv={onExportCsv} onExcel={onExportExcel} onPdf={onExportPdf} />
        <button type="button" onClick={onInviteSchoolAdmin} className="btn-secondary">
          Invite school admin
        </button>
        <button type="button" onClick={onInviteTeacher} className="btn-primary">
          Invite teacher
        </button>
        <button type="button" onClick={onAddTeacher} className="btn-secondary hidden" aria-hidden>
          Add teacher
        </button>
      </div>
      }
    />
  );
}
