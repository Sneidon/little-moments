import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Notice } from '@/components/ui';
import type { PasswordResetState } from '@/hooks/usePasswordReset';

type Target = { uid: string; email?: string | null };

export function PasswordResetDialog<T extends Target>({ reset, lockWhileSending }: { reset: PasswordResetState<T>; lockWhileSending?: boolean }) {
  const { pending } = reset;
  return (
    <ConfirmDialog
      open={!!pending}
      onClose={() => reset.setPending(null)}
      title="Send password reset email?"
      message={pending ? `Send a password reset link to ${pending.email}? They will receive an email to set a new password.` : ''}
      confirmLabel="Send reset email"
      onConfirm={() => pending && reset.send(pending)}
      confirmDisabled={lockWhileSending ? !!reset.loadingUid : undefined}
    />
  );
}

export function PasswordResetNotice<T extends Target>({ reset }: { reset: PasswordResetState<T> }) {
  if (reset.error) {
    return (
      <Notice tone="error" onDismiss={reset.dismissError}>
        {reset.error}
      </Notice>
    );
  }
  if (!reset.sentTo) return null;
  return (
    <Notice tone="success" onDismiss={reset.dismissSuccess}>
      Password reset email sent. The user will receive a link to set a new password.
    </Notice>
  );
}

type ButtonProps = { onClick: () => void; disabled: boolean; sending: boolean };

export function ResetPasswordButton({ onClick, disabled, sending }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      title="Send password reset email"
    >
      {sending ? 'Sending…' : 'Reset password'}
    </button>
  );
}
