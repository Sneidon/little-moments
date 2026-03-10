'use client';

import Link from 'next/link';

export interface PageHeroProps {
  /** Main title. Use gradient for dashboard-style pages. */
  title: React.ReactNode;
  /** Optional subtitle or description. */
  subtitle?: React.ReactNode;
  /** Optional actions (e.g. "Add school" button) rendered on the right. */
  actions?: React.ReactNode;
  /** If true, uses the full dashboard-style hero (gradient bg, dots, orbs). Default true. */
  variant?: 'full' | 'compact';
  /** Optional back link (e.g. for subpages). */
  backHref?: string;
  /** Label for back link. Default "Back". */
  backLabel?: string;
  className?: string;
}

export function PageHero({ title, subtitle, actions, variant = 'full', backHref, backLabel = 'Back', className = '' }: PageHeroProps) {
  const backLink = backHref ? (
    <Link href={backHref} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
      ← {backLabel}
    </Link>
  ) : null;

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
        <div>
          {backLink}
          <h1 className={`heading-daycare text-2xl sm:text-3xl ${backLink ? 'mt-1' : ''}`}>{title}</h1>
          {subtitle != null && (
            <p className="mt-1.5 text-slate-600 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions != null && (
          <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`mb-10 ${className}`}>
      <div className="relative rounded-card-lg border-2 border-primary-200/60 bg-gradient-to-br from-primary-50 via-warm-50 to-accent-50 px-6 py-6 shadow-glow-sm dark:border-primary-700/40 dark:from-primary-900/30 dark:via-slate-800 dark:to-accent-900/30">
        {/* Background layer only: clip decorations to rounded card so dropdowns in content are not clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-card-lg" aria-hidden>
          <div className="absolute inset-0 bg-pattern-dots opacity-60" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {backLink}
            <h1 className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${backLink ? 'mt-1' : ''}`}>{title}</h1>
            {subtitle != null && (
              <p className="mt-2 text-slate-600 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions != null && (
            <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
