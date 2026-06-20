/** Display labels for daily report types (Firestore `type` field). */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  nappy_change: 'Nappy change',
  meal: 'Meal',
  nap_time: 'Nap time',
  medication: 'Medication',
  incident: 'Incident',
  activity: 'Activity',
  check_in: 'Check in',
  check_out: 'Check out',
};

/** Label shown for teacher photo posts (stored as type `incident` with media). */
export const PHOTO_REPORT_LABEL = 'Photo';

/** Label shown for teacher video posts (stored as type `incident` with media). */
export const VIDEO_REPORT_LABEL = 'Video';

/** Options for report type filter (value + label). */
export const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'nappy_change', label: 'Nappy change' },
  { value: 'meal', label: 'Meal' },
  { value: 'nap_time', label: 'Nap time' },
  { value: 'medication', label: 'Medication' },
  { value: 'activity', label: 'Activity' },
  { value: 'check_in', label: 'Check in' },
  { value: 'check_out', label: 'Check out' },
  { value: 'photo', label: PHOTO_REPORT_LABEL },
  { value: 'video', label: VIDEO_REPORT_LABEL },
  { value: 'incident', label: 'Incident' },
];

/** Tailwind class names for report type badges. */
export const REPORT_TYPE_STYLES: Record<string, string> = {
  nappy_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  meal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  nap_time: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  medication: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  activity: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  check_in: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  check_out: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  incident: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  photo: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  video: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
};
