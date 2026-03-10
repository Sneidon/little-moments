'use client';

import Link from 'next/link';
import type { UserProfile } from 'shared/types';
import { PageHero } from '@/components/ui';

export interface ParentDetailHeaderProps {
  parent: UserProfile;
  childrenCount: number;
  onRequestPasswordReset?: () => void;
  passwordResetSending?: boolean;
}

export function ParentDetailHeader({
  parent,
  childrenCount,
  onRequestPasswordReset,
  passwordResetSending,
}: ParentDetailHeaderProps) {
  return (
    <PageHero
      variant="full"
      backHref="/principal/parents"
      backLabel="Parents"
      title={<span className="text-gradient-warm">{parent.displayName ?? '—'}</span>}
      subtitle={`${childrenCount} linked ${childrenCount === 1 ? 'child' : 'children'}`}
      actions={
        parent.email && onRequestPasswordReset ? (
          <button
            type="button"
            onClick={onRequestPasswordReset}
            disabled={passwordResetSending}
            className="btn-secondary disabled:opacity-50"
            title="Send password reset email to this parent"
          >
            {passwordResetSending ? 'Sending…' : 'Send password reset email'}
          </button>
        ) : undefined
      }
    />
  );
}
