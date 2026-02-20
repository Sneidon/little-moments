'use client';

interface LoadingScreenProps {
  message?: string;
  /** Use 'primary' for principal area, 'slate' for admin */
  variant?: 'primary' | 'slate';
}

export function LoadingScreen({ message, variant = 'primary' }: LoadingScreenProps) {
  const borderClass = variant === 'primary' ? 'border-primary-600 border-t-transparent' : 'border-slate-600 border-t-transparent';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 dark:bg-slate-900"
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      <div
        className={`h-10 w-10 animate-spin rounded-full border-2 ${borderClass}`}
        aria-hidden
      />
      {message && (
        <p className="text-sm font-medium text-slate-600 animate-fade-in dark:text-slate-400">{message}</p>
      )}
    </div>
  );
}
