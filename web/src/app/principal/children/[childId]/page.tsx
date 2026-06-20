'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { formatClassDisplay, ageFromDob } from '@/lib/formatClass';
import { getReportsForDay, getDaysWithActivity, getActivitySummaryText, localDateIso } from '@/lib/reports';
import { exportChildDetailsToPdf } from '@/lib/exportChildDetailsPdf';
import { exportChildDetailsToCsv } from '@/lib/exportChildDetailsCsv';
import { exportChildDetailsToExcel } from '@/lib/exportChildDetailsExcel';
import { useChildDetail } from '@/hooks/useChildDetail';
import { useChildParents } from '@/hooks/useChildParents';
import { useParentsManagement } from '@/hooks/useParentsManagement';
import { useSchoolName } from '@/hooks/useSchoolName';
import { doc, updateDoc } from 'firebase/firestore';
import { ExportPdfOptionsDialog } from '@/components/ExportPdfOptionsDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { UserProfile } from 'shared/types';
import { db } from '@/config/firebase';
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
  const router = useRouter();
  const { profile } = useAuth();
  const params = useParams();
  const childId = params?.childId as string;
  const schoolName = useSchoolName(profile?.schoolId);
  const { child, setChild, classes, reports, loading } = useChildDetail(
    profile?.schoolId,
    childId
  );
  const { parents, refetch: refetchParents } = useChildParents(child);
  const [filterDay, setFilterDay] = useState(() => localDateIso());
  const [exportPdfOpen, setExportPdfOpen] = useState(false);
  const [pendingRemoveParent, setPendingRemoveParent] = useState<UserProfile | null>(null);
  const [removeParentDialogBusy, setRemoveParentDialogBusy] = useState(false);
  const [enrollmentUpdating, setEnrollmentUpdating] = useState(false);

  const parentManagement = useParentsManagement({
    child,
    schoolId: profile?.schoolId,
    parents,
    refetchParents,
    setChild,
  });

  useEffect(() => {
    if (!pendingRemoveParent) setRemoveParentDialogBusy(false);
  }, [pendingRemoveParent]);

  const handleConfirmRemoveParentFromChild = async () => {
    if (!pendingRemoveParent || removeParentDialogBusy) return;
    setRemoveParentDialogBusy(true);
    try {
      const { success, deletedAccount } = await parentManagement.handleRemoveParentFromChild(
        pendingRemoveParent.uid
      );
      if (success) {
        setPendingRemoveParent(null);
        if (deletedAccount) {
          router.push('/principal/parents');
        }
      }
    } finally {
      setRemoveParentDialogBusy(false);
    }
  };

  const classDisplay = useCallback(
    (id: string | null | undefined) =>
      id ? formatClassDisplay(classes.find((c) => c.id === id)) || id : '—',
    [classes]
  );

  const handleSetEnrollmentActive = useCallback(
    async (active: boolean) => {
      if (!profile?.schoolId || !child?.id) return;
      setEnrollmentUpdating(true);
      try {
        const now = new Date().toISOString();
        await updateDoc(doc(db, 'schools', profile.schoolId, 'children', child.id), {
          isActive: active,
          ...(active ? {} : { classId: null }),
          updatedAt: now,
        });
        setChild((prev) =>
          prev
            ? {
                ...prev,
                isActive: active,
                ...(active ? {} : { classId: undefined }),
              }
            : null
        );
      } finally {
        setEnrollmentUpdating(false);
      }
    },
    [profile?.schoolId, child?.id, setChild]
  );

  const reportsForDay = getReportsForDay(reports, filterDay);
  const daysWithActivity = getDaysWithActivity(reports);
  const todayIso = localDateIso();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayIso = localDateIso(yesterdayDate);
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
        schoolName: schoolName ?? undefined,
        include: {
          profile: set.has('profile'),
          parents: set.has('parents'),
          activitySummary: set.has('activitySummary'),
        },
      });
    },
    [child, classes, parents, reports, classDisplay, schoolName]
  );

  const handleExportCsv = useCallback(() => {
    if (!child) return;
    exportChildDetailsToCsv({ child, classes, parents, reports, classDisplay });
  }, [child, classes, parents, reports, classDisplay]);

  const handleExportExcel = useCallback(() => {
    if (!child) return;
    exportChildDetailsToExcel({ child, classes, parents, reports, classDisplay });
  }, [child, classes, parents, reports, classDisplay]);

  if (loading || !child) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={!!pendingRemoveParent}
        onClose={() => setPendingRemoveParent(null)}
        title="Remove parent from this child?"
        message={
          pendingRemoveParent && child
            ? `Remove ${pendingRemoveParent.displayName || pendingRemoveParent.email || 'this parent'} from ${child.name ?? 'this child'}? They will lose access to this child’s updates. If they are not linked to any other children at your school, their account will be permanently deleted and they won’t be able to sign in.`
            : ''
        }
        confirmLabel="Remove from child"
        cancelLabel="Cancel"
        confirmDisabled={
          removeParentDialogBusy ||
          Boolean(pendingRemoveParent && parentManagement.removingParentUid === pendingRemoveParent.uid)
        }
        onConfirm={handleConfirmRemoveParentFromChild}
      />
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
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        enrollmentUpdating={enrollmentUpdating}
        onSetEnrollmentActive={handleSetEnrollmentActive}
      />

      {parentManagement.removeParentError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {parentManagement.removeParentError}
        </div>
      ) : null}

      <ParentsSection
        childName={child?.name}
        maxParents={parentManagement.maxParents}
        parents={parents}
        getParentProfileHref={(p) => `/principal/parents/${p.uid}`}
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
        onRequestRemoveParentFromChild={(p) => setPendingRemoveParent(p)}
        removingParentUid={parentManagement.removingParentUid}
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
