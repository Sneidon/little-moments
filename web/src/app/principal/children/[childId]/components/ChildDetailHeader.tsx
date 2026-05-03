'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Child } from 'shared/types';
import { PageHero, SectionCard } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChildProfileCard } from './ChildProfileCard';

export interface ChildDetailHeaderProps {
  child: Child;
  ageText: string;
  classDisplay: string;
  reportsCount: number;
  lastReportTimestamp?: string;
  onExportPdf: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  /** Back link href. Default: /principal/children */
  backHref?: string;
  /** Back link label. Default: Back to children */
  backLabel?: string;
  /** Show "Edit details" link. Default: true */
  showEditLink?: boolean;
  enrollmentUpdating?: boolean;
  onSetEnrollmentActive?: (active: boolean) => void | Promise<void>;
}

export function ChildDetailHeader({
  child,
  ageText,
  classDisplay,
  reportsCount,
  lastReportTimestamp,
  onExportPdf,
  onExportCsv,
  onExportExcel,
  backHref = '/principal/children',
  backLabel = 'Back to children',
  showEditLink = true,
  enrollmentUpdating,
  onSetEnrollmentActive,
}: ChildDetailHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [leaveSchoolConfirmOpen, setLeaveSchoolConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rosterEnrolled = child.isActive !== false;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePdf = () => {
    onExportPdf();
    setExportOpen(false);
  };
  const handleCsv = () => {
    onExportCsv?.();
    setExportOpen(false);
  };
  const handleExcel = () => {
    onExportExcel?.();
    setExportOpen(false);
  };

  const subtitle = (
    <>
      {reportsCount} {reportsCount === 1 ? 'activity' : 'activities'} total
      {lastReportTimestamp && (
        <>
          {' '}
          · Last activity{' '}
          {new Date(lastReportTimestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </>
      )}
    </>
  );

  const titleContent = (
    <>
      <span className="text-gradient-warm">{child.name}</span>
      {child.preferredName && (
        <span className="ml-2 text-lg font-normal text-slate-600 dark:text-slate-300">
          &quot;{child.preferredName}&quot;
        </span>
      )}
    </>
  );

  const confirmLeaveSchool = useCallback(async () => {
    if (!onSetEnrollmentActive) return;
    try {
      await onSetEnrollmentActive(false);
      setLeaveSchoolConfirmOpen(false);
    } catch {
      // Keep dialog open so the user can retry or cancel after a failed save.
    }
  }, [onSetEnrollmentActive]);

  const exportDropdown = (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setExportOpen((o) => !o)}
        className="btn-secondary inline-flex items-center gap-2"
        aria-expanded={exportOpen}
        aria-haspopup="true"
      >
        <span>Export</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {exportOpen && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1.5 shadow-xl"
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Download as
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleCsv}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
            Spreadsheet (CSV)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExcel}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
            Excel
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handlePdf}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
            PDF document
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {onSetEnrollmentActive ? (
        <ConfirmDialog
          open={leaveSchoolConfirmOpen}
          onClose={() => setLeaveSchoolConfirmOpen(false)}
          title="Mark as left school?"
          message={`${child.name} will be removed from their class immediately, hidden from teacher rosters and the parent app, and parents will stop receiving routine updates for this child. Only continue if they have actually left the school. You can enroll them again later and assign a class from Edit details.`}
          confirmLabel="Mark as left school"
          cancelLabel="Cancel"
          confirmDisabled={enrollmentUpdating}
          onConfirm={() => void confirmLeaveSchool()}
        />
      ) : null}
      <PageHero
        variant="full"
        backHref={backHref}
        backLabel={backLabel}
        title={titleContent}
        subtitle={subtitle}
        actions={
          <>
            {exportDropdown}
            {showEditLink && (
              <Link href={`/principal/children?edit=${child.id}`} className="btn-secondary">
                Edit details
              </Link>
            )}
            {onSetEnrollmentActive &&
              (rosterEnrolled ? (
                <button
                  type="button"
                  disabled={enrollmentUpdating}
                  onClick={() => setLeaveSchoolConfirmOpen(true)}
                  className="inline-flex items-center rounded-lg border border-amber-600/70 bg-white px-3 py-2 text-sm font-medium text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/70"
                >
                  Mark as left school
                </button>
              ) : (
                <button
                  type="button"
                  disabled={enrollmentUpdating}
                  onClick={() => void onSetEnrollmentActive(true)}
                  className="btn-primary inline-flex items-center px-3 py-2 text-sm disabled:opacity-50"
                >
                  {enrollmentUpdating ? 'Saving…' : 'Mark as enrolled again'}
                </button>
              ))}
          </>
        }
      />
      <SectionCard topBar="primary" padding="default" className="mb-8">
        {onSetEnrollmentActive ? (
          <p
            className={`mb-6 text-sm ${
              rosterEnrolled
                ? 'text-slate-600 dark:text-slate-300'
                : 'rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200'
            }`}
          >
            {rosterEnrolled ? (
              <>
                <span className="font-medium text-slate-800 dark:text-slate-100">Enrolled at your school.</span>{' '}
                Visible to assigned teachers and linked parents on their devices.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-800 dark:text-slate-100">Marked as left school.</span>{' '}
                Not on the class roster; parents no longer see day-to-day access for this child. Use{' '}
                <span className="font-medium">Mark as enrolled again</span> above, then{' '}
                <span className="font-medium">Edit details</span> to assign a class.
              </>
            )}
          </p>
        ) : null}
        <ChildProfileCard child={child} ageText={ageText} classDisplay={classDisplay} />
      </SectionCard>
    </>
  );
}
