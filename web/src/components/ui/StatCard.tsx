'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { SectionCard } from './SectionCard';
import type { TopBarVariant } from './SectionCard';

export interface StatCardProps {
  /** If set, the card is a link. */
  to?: string;
  label: string;
  value: number | string;
  desc?: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  bar: TopBarVariant;
  /** If true, the number uses gradient text (e.g. first card on dashboard). */
  gradientValue?: boolean;
  /** Stagger animation delay in ms. */
  animationDelay?: number;
}

export function StatCard({
  to,
  label,
  value,
  desc,
  icon: Icon,
  bar,
  gradientValue = false,
  animationDelay = 0,
}: StatCardProps) {
  const content = (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 shadow-inner dark:from-primary-400/20 dark:to-accent-400/20">
        <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
      </div>
      <p
        className={
          gradientValue
            ? 'text-3xl font-extrabold tabular-nums sm:text-4xl text-gradient'
            : 'stat-number text-3xl sm:text-4xl'
        }
      >
        {value}
      </p>
      <h2 className="mt-1.5 font-bold text-slate-800 dark:text-slate-200">{label}</h2>
      {desc != null && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
      )}
    </>
  );

  const className = `block opacity-0 animate-stagger-in ${to ? 'group' : ''}`;
  const style = animationDelay > 0 ? { animationDelay: `${animationDelay}ms` } : undefined;

  if (to) {
    return (
      <Link href={to} className={className} style={style}>
        <SectionCard topBar={bar} padding="default" hover>
          {content}
        </SectionCard>
      </Link>
    );
  }

  return (
    <div className={className} style={style}>
      <SectionCard topBar={bar} padding="default">
        {content}
      </SectionCard>
    </div>
  );
}
