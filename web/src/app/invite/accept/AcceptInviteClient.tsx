'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AcceptExistingCard, AcceptNewForm } from './AcceptForms';
import { AlreadyUsedCard, AppReadyCard, LoadingCard, MessageCard } from './InviteCards';
import { useAcceptInvite } from './useAcceptInvite';

const ACCESS_LABELS: Record<string, string> = { super_admin: 'super admin', principal: 'school admin', teacher: 'teacher', parent: 'parent' };

function InviteBody({ token }: { token: string }) {
  const invite = useAcceptInvite(token);
  const { precheck } = invite;
  const common = { hasToken: !!token, error: invite.error, submitting: invite.submitting, done: invite.done };

  if (precheck.kind === 'loading') return <LoadingCard />;
  if (precheck.kind === 'already_used') return <AlreadyUsedCard role={precheck.role} />;
  if (precheck.kind === 'expired') return <MessageCard title="This invite has expired" body="Ask your school or an administrator to send a new invitation." />;
  if (precheck.kind === 'not_found') {
    return <MessageCard title="Invite not found" body="This link may be invalid or no longer available. Request a new invite if you need access." />;
  }
  if (invite.appOnlyRole) return <AppReadyCard role={invite.appOnlyRole} existing={invite.joinedExisting} />;
  if (precheck.kind === 'ok' && precheck.accountExists) {
    return (
      <AcceptExistingCard
        {...common}
        email={precheck.email}
        accessLabel={ACCESS_LABELS[precheck.role ?? ''] ?? 'member'}
        onAccept={() => void invite.accept()}
      />
    );
  }
  return <AcceptNewForm {...common} onAccept={(details) => void invite.accept(details)} />;
}

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-warm-100 via-primary-100/70 to-accent-100/80 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-pattern-dots opacity-40 dark:opacity-20" aria-hidden />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-0 w-full max-w-sm animate-fade-in-up">
        <InviteBody token={token} />
      </div>
    </div>
  );
}
