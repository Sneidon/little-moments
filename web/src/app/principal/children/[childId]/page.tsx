'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { formatClassDisplay, ageFromDob } from '@/lib/formatClass';
import { getReportsForDay, getDaysWithActivity, getActivitySummaryText } from '@/lib/reports';
import { exportChildDetailsToPdf } from '@/lib/exportChildDetailsPdf';
import { useChildDetail } from '@/hooks/useChildDetail';
import { useChildParents } from '@/hooks/useChildParents';
import { useParentsManagement } from '@/hooks/useParentsManagement';
import { ExportPdfOptionsDialog } from '@/components/ExportPdfOptionsDialog';
import {
  ChildDetailHeader,
  ParentsSection,
  ActivityList,
} from './components';

const CHILD_EXPORT_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'parents', label: 'Parents' },
  { id: 'activitySummary', label: 'Activity summary' },
] as const;

export default function ChildDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const childId = params?.childId as string;
  const { child, setChild, classes, reports, loading } = useChildDetail(
    profile?.schoolId,
    childId
  );
  const { parents, refetch: refetchParents } = useChildParents(child);
  const [filterDay, setFilterDay] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [exportPdfOpen, setExportPdfOpen] = useState(false);

  const parentManagement = useParentsManagement({
    child,
    schoolId: profile?.schoolId,
    parents,
    refetchParents,
    setChild,
  });

  const classDisplay = useCallback(
    (id: string | null | undefined) =>
      id ? formatClassDisplay(classes.find((c) => c.id === id)) || id : '—',
    [classes]
  );

  const reportsForDay = getReportsForDay(reports, filterDay);
  const daysWithActivity = getDaysWithActivity(reports);
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const activitySummaryText = getActivitySummaryText(reportsForDay);

  const openExportPdf = useCallback(() => setExportPdfOpen(true), []);

  const handleExportPdfWithOptions = useCallback(
    (selectedIds: string[]) => {
      if (!child) return;
      const set = new Set(selectedIds);
      exportChildDetailsToPdf({
        child,
        classes,
        parents,
        reports,
        classDisplay,
        include: {
          profile: set.has('profile'),
          parents: set.has('parents'),
          activitySummary: set.has('activitySummary'),
        },
      });
    },
    [child, classes, parents, reports, classDisplay]
  );

  if (loading || !child) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ExportPdfOptionsDialog
        open={exportPdfOpen}
        onClose={() => setExportPdfOpen(false)}
        title="Export child details to PDF"
        sections={CHILD_EXPORT_SECTIONS}
        onExport={handleExportPdfWithOptions}
      />
      <ChildDetailHeader
        child={child}
        ageText={ageFromDob(child.dateOfBirth)}
        classDisplay={classDisplay(child.classId)}
        reportsCount={reports.length}
        lastReportTimestamp={reports[0]?.timestamp}
        onExportPdf={openExportPdf}
      />

      <ParentsSection
        childName={child?.name}
        maxParents={parentManagement.maxParents}
        parents={parents}
        canInviteMore={parentManagement.canInviteMore}
        showInviteParent={parentManagement.showInviteParent}
        setShowInviteParent={parentManagement.setShowInviteParent}
        inviteForm={parentManagement.inviteForm}
        setInviteForm={parentManagement.setInviteForm}
        inviteStep={parentManagement.inviteStep}
        inviteCheckLoading={parentManagement.inviteCheckLoading}
        inviteCheckError={parentManagement.inviteCheckError}
        onCheckEmail={parentManagement.handleCheckEmail}
        resetInviteToStep1={parentManagement.resetInviteToStep1}
        inviteSubmitting={parentManagement.inviteSubmitting}
        inviteError={parentManagement.inviteError}
        setInviteError={parentManagement.setInviteError}
        onInviteSubmit={parentManagement.handleInviteParent}
        onStartEditParent={parentManagement.startEditParent}
        editingParentUid={parentManagement.editingParentUid}
        editParentForm={parentManagement.editParentForm}
        setEditParentForm={parentManagement.setEditParentForm}
        editParentSubmitting={parentManagement.editParentSubmitting}
        editParentError={parentManagement.editParentError}
        onUpdateParentSubmit={parentManagement.handleUpdateParent}
        onCancelEdit={parentManagement.cancelEditParent}
      />

      <ActivityList
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        todayIso={todayIso}
        yesterdayIso={yesterdayIso}
        daysWithActivity={daysWithActivity}
        reportsForDay={reportsForDay}
        activitySummaryText={activitySummaryText}
      />
    </div>
  );
}
