'use client';

import Link from 'next/link';
import { formatClassDisplay } from '@/lib/formatClass';
import type { ClassRoom } from 'shared/types';
import { PageHero, SectionCard, ExportMenu } from '@/components/ui';

export interface ClassDetailHeaderProps {
  classRoom: ClassRoom;
  assignedTeacherName: string;
  childrenCount: number;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  backHref?: string;
  backLabel?: string;
  showEditLink?: boolean;
}

export function ClassDetailHeader({
  classRoom,
  assignedTeacherName,
  childrenCount,
  onExportPdf,
  onExportCsv,
  onExportExcel,
  backHref = '/principal/classes',
  backLabel = 'Back to classes',
  showEditLink = true,
}: ClassDetailHeaderProps) {
  const showExport = onExportPdf ?? onExportCsv ?? onExportExcel;

  const exportDropdown = showExport ? (
    <ExportMenu onCsv={onExportCsv} onExcel={onExportExcel} onPdf={onExportPdf} />
  ) : null;

  return (
    <>
      <PageHero
        variant="full"
        backHref={backHref}
        backLabel={backLabel}
        title={<span className="text-gradient-warm">{formatClassDisplay(classRoom)}</span>}
        subtitle={`Assigned teacher: ${assignedTeacherName} · ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''} in this class`}
        actions={
          <>
            {showEditLink && (
              <Link href={`/principal/classes?edit=${classRoom.id}`} className="btn-secondary">
                Edit details
              </Link>
            )}
            {exportDropdown}
          </>
        }
      />
      <SectionCard topBar="accent" padding="default" className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Class details
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          Assigned teacher: {assignedTeacherName}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {childrenCount} child{childrenCount !== 1 ? 'ren' : ''} in this class
        </p>
      </SectionCard>
    </>
  );
}
