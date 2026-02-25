'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEvent } from '@/hooks/useEvent';
import { useEventRSVPs } from '@/hooks/useEventRSVPs';
import { downloadEventRsvpsCsv } from '@/lib/exportEventRsvpsCsv';
import { exportEventRsvpsToExcel } from '@/lib/exportEventRsvpsExcel';
import { exportEventRsvpsToPdf } from '@/lib/exportEventRsvpsPdf';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function EventRsvpsPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { event, loading: eventLoading } = useEvent(schoolId, eventId);
  const { entries, loading: rsvpsLoading } = useEventRSVPs(
    event?.schoolId,
    event?.parentResponses
  );

  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (eventLoading && !event) {
    return <LoadingScreen message="Loading event…" />;
  }

  if (!event) {
    return (
      <div className="animate-fade-in">
        <p className="text-slate-600 dark:text-slate-400">Event not found.</p>
        <Link href="/principal/events" className="btn-secondary mt-4 inline-block">
          Back to events
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.startAt).toLocaleString();
  const loading = eventLoading || rsvpsLoading;
  const acceptedCount = entries.filter((e) => e.response === 'accepted').length;
  const declinedCount = entries.filter((e) => e.response === 'declined').length;

  const handleExportCsv = () => {
    downloadEventRsvpsCsv(entries, event.title, eventDate);
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    exportEventRsvpsToExcel(entries, event.title, eventDate);
    setExportOpen(false);
  };

  const handleExportPdf = () => {
    exportEventRsvpsToPdf(entries, event.title, eventDate);
    setExportOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/principal/events"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            ← Back to events
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            RSVPs: {event.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {eventDate}
            {event.parentResponses && Object.keys(event.parentResponses).length > 0 && (
              <span className="ml-2">
                · {acceptedCount} going · {declinedCount} can&apos;t make it
              </span>
            )}
          </p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="btn-secondary inline-flex items-center gap-2"
            aria-expanded={exportOpen}
            aria-haspopup="true"
            title="Export RSVP list"
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
                onClick={handleExportCsv}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
                Spreadsheet (CSV)
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleExportExcel}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
                Excel
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleExportPdf}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
                PDF document
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-6 py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No RSVPs yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-600">
            {entries.map((entry) => (
              <li
                key={entry.uid}
                className="flex items-start justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {entry.displayName ?? entry.uid.slice(0, 8) + '…'}
                  </span>
                  {entry.children.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {entry.children.map((c, i) => (
                        <li key={i}>
                          {c.name}{' '}
                          <span className="text-slate-500 dark:text-slate-400">
                            ({c.className})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span
                  className={
                    entry.response === 'accepted'
                      ? 'shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                  }
                >
                  {entry.response === 'accepted' ? 'Going' : "Can't make it"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
