/** Display labels for daily report types. */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  nappy_change: 'Nappy change',
  meal: 'Meal',
  nap_time: 'Nap time',
  medication: 'Medication',
  incident: 'Incident',
};

/** Options for report type filter (value + label). */
export const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  ...Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

/** Tailwind class names for report type badges. */
export const REPORT_TYPE_STYLES: Record<string, string> = {
  nappy_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  meal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  nap_time: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  medication: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  incident: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};
