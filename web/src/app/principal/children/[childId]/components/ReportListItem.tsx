import type { DailyReport } from 'shared/types';
import { getReportDetailsSummary, getReportTypeLabel, getReportTypeStyle, isVideoReport } from '@/lib/reports';

export interface ReportListItemProps {
  report: DailyReport;
}

export function ReportListItem({ report }: ReportListItemProps) {
  const typeLabel = getReportTypeLabel(report);
  const typeStyle = getReportTypeStyle(report);

  const detailsSummary = getReportDetailsSummary(report);
  const titleLine = detailsSummary !== '—' ? detailsSummary : null;

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 p-4">
      <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle}`}>
        {typeLabel}
      </span>
      <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
        {report.timestamp
          ? new Date(report.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          : '—'}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {titleLine ? (
          <p className="text-sm text-slate-800 dark:text-slate-200">{titleLine}</p>
        ) : null}
        {report.notes ? <p className="text-sm text-slate-600 dark:text-slate-300">{report.notes}</p> : null}
        {report.imageUrl ? (
          isVideoReport(report) ? (
            <a
              href={report.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
            >
              Open video
            </a>
          ) : (
            <a
              href={report.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <img src={report.imageUrl} alt="Report attachment" className="h-20 w-auto object-cover" />
            </a>
          )
        ) : null}
      </div>
    </li>
  );
}
