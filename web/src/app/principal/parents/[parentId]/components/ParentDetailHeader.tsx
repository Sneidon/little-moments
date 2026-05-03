'use client';

import Link from 'next/link';
import type { UserProfile } from 'shared/types';
import { PageHero } from '@/components/ui';

export interface ParentDetailHeaderProps {
  parent: UserProfile;
  childrenCount: number;
  onRequestPasswordReset?: () => void;
  passwordResetSending?: boolean;
  onRequestDeleteParent?: () => void;
  deleteParentDisabled?: boolean;
}

export function ParentDetailHeader({
  parent,
  childrenCount,
  onRequestPasswordReset,
  passwordResetSending,
  onRequestDeleteParent,
  deleteParentDisabled,
}: ParentDetailHeaderProps) {
  const actionsInner =
    parent.email && onRequestPasswordReset ? (
      <button
        type="button"
        onClick={onRequestPasswordReset}
        disabled={passwordResetSending || deleteParentDisabled}
        className="btn-secondary disabled:opacity-50"
        title="Send password reset email to this parent"
      >
        {passwordResetSending ? 'Sending…' : 'Send password reset email'}
      </button>
    ) : null;

  const deleteBtn = onRequestDeleteParent ? (
    <button
      type="button"
      onClick={onRequestDeleteParent}
      disabled={deleteParentDisabled}
      className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
    >
      Delete parent
    </button>
  ) : null;

  const combined =
    actionsInner || deleteBtn ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actionsInner}
        {deleteBtn}
      </div>
    ) : undefined;

  return (
    <PageHero
      variant="full"
      backHref="/principal/parents"
      backLabel="Parents"
      title={<span className="text-gradient-warm">{parent.displayName ?? '—'}</span>}
      subtitle={`${childrenCount} linked ${childrenCount === 1 ? 'child' : 'children'}`}
      actions={combined}
    />
  );
}
