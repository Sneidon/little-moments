import type { DailyReport } from 'shared/types';
import { REPORT_TYPE_LABELS, REPORT_TYPE_STYLES } from '@/constants/reports';

export interface ReportListItemProps {
  report: DailyReport;
}

export function ReportListItem({ report }: ReportListItemProps) {
  const typeLabel = REPORT_TYPE_LABELS[report.type ?? ''] ?? report.type ?? '—';
  const typeStyle = REPORT_TYPE_STYLES[report.type ?? ''] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';

  const titleLine =
    report.mealOptionName ?? report.mealType ?? report.medicationName ?? report.incidentDetails;
  const mealPrefix = report.type === 'meal' && report.mealType ? (
    <span className="capitalize text-slate-500 dark:text-slate-400">{report.mealType}</span>
  ) : null;
  const separator = report.type === 'meal' && report.mealType && (report.mealOptionName ?? report.notes) ? ' · ' : null;
  const mainContent = report.mealOptionName ?? report.medicationName ?? report.incidentDetails ?? (report.type === 'meal' ? report.mealType : report.mealType);

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 p-4">
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
          <p className="text-sm text-slate-800 dark:text-slate-200">
            {mealPrefix}
            {separator}
            {mainContent}
          </p>
        ) : null}
        {report.notes ? <p className="text-sm text-slate-600 dark:text-slate-300">{report.notes}</p> : null}
        {report.imageUrl ? (
          <a
            href={report.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <img src={report.imageUrl} alt="Report attachment" className="h-20 w-auto object-cover" />
          </a>
        ) : null}
      </div>
    </li>
  );
}
