type Props = {
  tone: 'success' | 'error';
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
};

const TONE = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
};

export function Notice({ tone, children, onDismiss, className = 'mb-6' }: Props) {
  return (
    <div className={`${className} rounded-xl border px-4 py-3 text-sm ${TONE[tone]}`} role={tone === 'success' ? 'status' : undefined}>
      <span className="flex items-center justify-between gap-2">
        {children}
        <button type="button" onClick={onDismiss} className="shrink-0 underline">
          Dismiss
        </button>
      </span>
    </div>
  );
}
