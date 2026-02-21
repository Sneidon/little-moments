'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useClassDetail, type ClassReportRow } from '@/hooks/useClassDetail';
import { getTeacherDisplayName } from '@/lib/teachers';
import { getReportsForDay, getDaysWithActivity } from '@/lib/reports';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportClassDetailToPdf } from '@/lib/exportClassDetailPdf';
import { exportClassDetailToCsv } from '@/lib/exportClassDetailCsv';
import { exportClassDetailToExcel } from '@/lib/exportClassDetailExcel';
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

  const classDisplayName = classRoom ? formatClassDisplay(classRoom) : '';
  const assignedTeacherNameStr =
    classRoom?.assignedTeacherId
      ? teacherName(classRoom.assignedTeacherId)
      : '—';

  const handleExportPdfWithOptions = useCallback(
    (selectedIds: string[]) => {
      if (!classRoom) return;
      const set = new Set(selectedIds);
      exportClassDetailToPdf({
        classRoom,
        assignedTeacherName: assignedTeacherNameStr,
        children,
        filterDay,
        reportsForDay,
        classDisplayName,
        include: {
          children: set.has('children'),
          activities: set.has('activities'),
        },
      });
    },
    [classRoom, children, filterDay, reportsForDay, teacherName, assignedTeacherNameStr, classDisplayName]
  );

  const handleExportCsv = useCallback(() => {
    if (!classRoom) return;
    exportClassDetailToCsv({
      classRoom,
      assignedTeacherName: assignedTeacherNameStr,
      children,
      filterDay,
      reportsForDay,
      classDisplayName,
    });
  }, [classRoom, children, filterDay, reportsForDay, assignedTeacherNameStr, classDisplayName]);

  const handleExportExcel = useCallback(() => {
    if (!classRoom) return;
    exportClassDetailToExcel({
      classRoom,
      assignedTeacherName: assignedTeacherNameStr,
      children,
      filterDay,
      reportsForDay,
      classDisplayName,
    });
  }, [classRoom, children, filterDay, reportsForDay, assignedTeacherNameStr, classDisplayName]);

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
        assignedTeacherName={assignedTeacherNameStr}
        childrenCount={children.length}
        onExportPdf={openExportPdf}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
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
