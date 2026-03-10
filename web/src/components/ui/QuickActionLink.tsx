'use client';

import Link from 'next/link';
import { IconArrowRight } from '@/components/icons/AdminIcons';

export interface QuickActionLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function QuickActionLink({ href, children, className = '' }: QuickActionLinkProps) {
  return (
    <Link
      href={href}
      className={`quick-action-card group flex items-center justify-between text-slate-700 dark:text-slate-200 ${className}`}
    >
      <span>{children}</span>
      <IconArrowRight className="h-5 w-5 text-slate-400 transition-all duration-200 group-hover:translate-x-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
    </Link>
  );
}
