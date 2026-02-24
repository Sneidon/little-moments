'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAdminSchoolDetail } from '@/hooks/useAdminSchoolDetail';
import { formatClassDisplay } from '@/lib/formatClass';
import { exportChildrenToPdf } from '@/lib/exportChildrenPdf';
import { exportChildrenToCsv } from '@/lib/exportChildrenCsv';
import { exportChildrenToExcel } from '@/lib/exportChildrenExcel';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminSchoolChildrenPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { school, classes, children, loading, error } = useAdminSchoolDetail(schoolId);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const classDisplay = (id: string) => formatClassDisplay(classes.find((r) => r.id === id)) || id;
  const filteredChildren = filterClassId
    ? children.filter((c) => c.classId === filterClassId)
    : children;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportPdf = () => {
    setExportOpen(false);
    setExportingPdf(true);
    try {
      exportChildrenToPdf(filteredChildren, classes, classDisplay, {
        onProgress: (msg) => {
          if (!msg) setExportingPdf(false);
        },
      });
    } catch (e) {
      console.error(e);
      setExportingPdf(false);
    }
  };
  const handleExportCsv = () => {
    setExportOpen(false);
    exportChildrenToCsv(filteredChildren, classes, classDisplay);
  };
  const handleExportExcel = () => {
    setExportOpen(false);
    exportChildrenToExcel(filteredChildren, classes, classDisplay);
  };

  if (loading) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error || !school) {
    return (
      <div className="animate-fade-in">
        <Link href="/admin/schools" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
          ← Back to schools
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error ?? 'School not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/schools/${schoolId}`}
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
          >
            ← Back to {school.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Children
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enrolled children at {school.name}
          </p>
        </div>
        <div className="relative shrink-0" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            disabled={exportingPdf || filteredChildren.length === 0}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
            aria-expanded={exportOpen}
            aria-haspopup="true"
          >
            <span>{exportingPdf ? 'Exporting…' : 'Export'}</span>
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
              <button type="button" role="menuitem" onClick={handleExportCsv} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="rounded bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 font-mono text-xs">CSV</span>
                Spreadsheet (CSV)
              </button>
              <button type="button" role="menuitem" onClick={handleExportExcel} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 font-mono text-xs text-emerald-800 dark:text-emerald-200">XLSX</span>
                Excel
              </button>
              <button type="button" role="menuitem" onClick={handleExportPdf} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="rounded bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 font-mono text-xs text-red-800 dark:text-red-200">PDF</span>
                PDF document
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-sm">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Filter by class</label>
        <select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{formatClassDisplay(c)}</option>
          ))}
        </select>
        {filterClassId && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredChildren.length} of {children.length} children
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Preferred</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">DOB</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Allergies</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Emergency</th>
              </tr>
            </thead>
            <tbody>
              {filteredChildren.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-600 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/admin/schools/${schoolId}/children/${c.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.preferredName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.classId ? classDisplay(c.classId) : '—'}</td>
                  <td className="px-4 py-3">
                    {c.allergies?.length ? (
                      <ul className="flex flex-wrap gap-1.5" role="list">
                        {c.allergies.map((a, idx) => (
                          <li key={idx}>
                            <span className="inline-flex rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                              {a.trim()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {c.emergencyContactName || c.emergencyContact ? (
                      <span title={c.emergencyContact ?? ''}>{c.emergencyContactName ?? c.emergencyContact ?? '—'}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredChildren.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              {filterClassId ? 'No children in this class.' : 'No children yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
