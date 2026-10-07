import { SectionCard } from '@/components/ui';
import type { InviteStatus } from './inviteUtils';

export function InviteTotals({ totals }: { totals: { total: number; pending: number; accepted: number; expired: number } }) {
  const cards = [
    { label: 'Total', value: totals.total, bar: 'primary' },
    { label: 'Pending', value: totals.pending, bar: 'accent' },
    { label: 'Accepted', value: totals.accepted, bar: 'warm' },
    { label: 'Expired', value: totals.expired, bar: 'accent' },
  ] as const;
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <SectionCard key={c.label} topBar={c.bar} className="p-4">
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className="text-2xl font-bold">{c.value}</p>
        </SectionCard>
      ))}
    </div>
  );
}

export function InviteNotices({ error, banner, onDismiss }: { error: string | null; banner: string | null; onDismiss: () => void }) {
  return (
    <>
      {error && (
        <SectionCard topBar="warm" className="mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </SectionCard>
      )}
      {banner && (
        <div
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
        >
          <span className="flex items-center justify-between gap-2">
            {banner}
            <button type="button" onClick={onDismiss} className="shrink-0 underline">
              Dismiss
            </button>
          </span>
        </div>
      )}
    </>
  );
}

const STATUS_CLASS: Record<InviteStatus, string> = {
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
};

export function InviteStatusBadge({ status }: { status: InviteStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>{status}</span>;
}

const SMALL_BUTTON =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border bg-white px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 dark:bg-slate-800';

export function ResendButton({ onClick, disabled, busy }: { onClick: () => void; disabled: boolean; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${SMALL_BUTTON} border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700`}
    >
      {busy ? 'Resending…' : 'Resend'}
    </button>
  );
}

export function DeleteButton({ onClick, disabled, busy }: { onClick: () => void; disabled: boolean; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${SMALL_BUTTON} border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40`}
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}

export const INVITE_TH = 'px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200';
export const INVITE_TD = 'px-4 py-3 text-slate-600 dark:text-slate-300';

export function InviteDateCells({ createdAt, expiresAt }: { createdAt: string; expiresAt: string }) {
  return (
    <>
      <td className={INVITE_TD}>{new Date(createdAt).toLocaleString()}</td>
      <td className={INVITE_TD}>{new Date(expiresAt).toLocaleString()}</td>
    </>
  );
}

export function NoMatchingInvites({ onClear }: { onClear: () => void }) {
  return (
    <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
      No invites match your filters.{' '}
      <button type="button" onClick={onClear} className="font-medium text-primary-600 underline dark:text-primary-400">
        Clear filters
      </button>
    </p>
  );
}
