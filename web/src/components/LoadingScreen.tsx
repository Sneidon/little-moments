'use client';

interface LoadingScreenProps {
  message?: string;
  /** Use 'primary' for principal area, 'slate' for admin */
  variant?: 'primary' | 'slate';
}

export function LoadingScreen({ message, variant = 'primary' }: LoadingScreenProps) {
  const spinnerClass = variant === 'primary'
    ? 'border-slate-200 border-t-primary-500 dark:border-slate-700 dark:border-t-primary-400'
    : 'border-slate-200 border-t-slate-500 dark:border-slate-700 dark:border-t-slate-400';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-warm-50 px-4 dark:bg-slate-900"
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      <div
        className={`h-12 w-12 animate-spin rounded-full border-2 ${spinnerClass}`}
        aria-hidden
      />
      {message && (
        <p className="text-sm font-semibold text-slate-600 animate-fade-in dark:text-slate-400">{message}</p>
      )}
    </div>
  );
}
