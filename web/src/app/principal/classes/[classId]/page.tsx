'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useClassDetail, type ClassReportRow } from '@/hooks/useClassDetail';
import { getTeacherDisplayName } from '@/lib/teachers';
import { getReportsForDay, getDaysWithActivity } from '@/lib/reports';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportClassDetailToPdf } from '@/lib/exportClassDetailPdf';
import { ExportPdfOptionsDialog } from '@/components/ExportPdfOptionsDialog';
import {
  ClassDetailHeader,
  ClassActivitiesSection,
  ChildrenInClassList,
} from './components';

const CLASS_EXPORT_SECTIONS = [
  { id: 'children', label: 'Children in this class' },
  { id: 'activities', label: 'Activities for selected day' },
] as const;

export default function ClassActivitiesPage() {
  const { profile } = useAuth();
  const params = useParams();
  const classId = params?.classId as string;
  const { classRoom, children, teachers, reports, loading } = useClassDetail(
    profile?.schoolId,
    classId
  );
  const [filterDay, setFilterDay] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [exportPdfOpen, setExportPdfOpen] = useState(false);

  const teacherName = useCallback(
    (uid: string) => getTeacherDisplayName(uid, teachers),
    [teachers]
  );

  const reportsForDay = getReportsForDay(reports, filterDay) as ClassReportRow[];
  const daysWithActivity = getDaysWithActivity(reports);

  const openExportPdf = useCallback(() => setExportPdfOpen(true), []);

  const handleExportPdfWithOptions = useCallback(
    (selectedIds: string[]) => {
      if (!classRoom) return;
      const set = new Set(selectedIds);
      exportClassDetailToPdf({
        classRoom,
        assignedTeacherName:
          classRoom.assignedTeacherId
            ? teacherName(classRoom.assignedTeacherId)
            : '—',
        children,
        filterDay,
        reportsForDay,
        classDisplayName: formatClassDisplay(classRoom),
        include: {
          children: set.has('children'),
          activities: set.has('activities'),
        },
      });
    },
    [classRoom, children, filterDay, reportsForDay, teacherName]
  );

  if (loading || !classRoom) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <ExportPdfOptionsDialog
        open={exportPdfOpen}
        onClose={() => setExportPdfOpen(false)}
        title="Export class to PDF"
        sections={CLASS_EXPORT_SECTIONS}
        onExport={handleExportPdfWithOptions}
      />
      <ClassDetailHeader
        classRoom={classRoom}
        assignedTeacherName={
          classRoom.assignedTeacherId
            ? teacherName(classRoom.assignedTeacherId)
            : '—'
        }
        childrenCount={children.length}
        onExportPdf={openExportPdf}
      />

      <ClassActivitiesSection
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        daysWithActivity={daysWithActivity}
        reportsForDay={reportsForDay}
      />

      <ChildrenInClassList children={children} />
    </div>
  );
}
