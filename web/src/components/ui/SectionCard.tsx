'use client';

export type TopBarVariant = 'primary' | 'accent' | 'warm';

const topBarClass: Record<TopBarVariant, string> = {
  primary: 'card-top-primary',
  accent: 'card-top-accent',
  warm: 'card-top-warm',
};

export interface SectionCardProps {
  children: React.ReactNode;
  /** Colored gradient bar at the top. Omit for plain card. */
  topBar?: TopBarVariant;
  /** Extra class for the wrapper. */
  className?: string;
  /** If true, card lifts on hover (for clickable cards). */
  hover?: boolean;
  /** Padding. Default 'default' (p-6). Use 'none' for tables that need full bleed. */
  padding?: 'default' | 'none' | 'sm';
}

export function SectionCard({
  children,
  topBar,
  className = '',
  hover = false,
  padding = 'default',
}: SectionCardProps) {
  const baseClass = topBar ? topBarClass[topBar] : 'card';
  const paddingClass =
    padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-6';
  const overflowClass = padding === 'none' ? 'overflow-hidden' : '';
  const hoverClass = hover
    ? ' transition-all duration-250 ease-smooth group-hover:-translate-y-1 group-hover:shadow-card-hover group-hover:border-primary-200 dark:group-hover:border-primary-700'
    : '';

  return (
    <div
      className={`${baseClass} ${paddingClass} ${overflowClass} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
