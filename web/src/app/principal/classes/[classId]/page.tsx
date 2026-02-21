'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useClassDetail, type ClassReportRow } from '@/hooks/useClassDetail';
import { getTeacherDisplayName } from '@/lib/teachers';
import { getReportsForDay, getDaysWithActivity } from '@/lib/reports';
import {
  ClassDetailHeader,
  ClassActivitiesSection,
  ChildrenInClassList,
} from './components';

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

  const teacherName = useCallback(
    (uid: string) => getTeacherDisplayName(uid, teachers),
    [teachers]
  );

  const reportsForDay = getReportsForDay(reports, filterDay) as ClassReportRow[];
  const daysWithActivity = getDaysWithActivity(reports);

  if (loading || !classRoom) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <ClassDetailHeader
        classRoom={classRoom}
        assignedTeacherName={
          classRoom.assignedTeacherId
            ? teacherName(classRoom.assignedTeacherId)
            : '—'
        }
        childrenCount={children.length}
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
