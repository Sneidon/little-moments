import Link from 'next/link';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { InviteLinkShareControls } from '@/components/InviteLinkShareControls';
import { SectionCard } from '@/components/ui';
import { callableErrorMessage } from '../callableError';

const EMPTY_FORM = { email: '', displayName: '' };
const INPUT =
  'w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';
const LABEL = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

type SentProps = {
  result: { token?: string; expiresAt?: string };
  feedback: string | null;
  onCopied: () => void;
  onCopyFail: (url: string) => void;
};

function InviteSent({ result, feedback, onCopied, onCopyFail }: SentProps) {
  return (
    <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
      <p className="font-semibold">Invite sent.</p>
      <p className="mt-1">
        Expires at: <span className="font-mono">{result.expiresAt}</span>
      </p>
      <p className="mt-2 text-green-700/90 dark:text-green-300/90">
        Track status under Admin →{' '}
        <Link href="/admin/invites" className="underline">
          Invites
        </Link>
        .
      </p>
      {feedback ? <p className="mt-2 text-xs font-medium text-green-800 dark:text-green-300">{feedback}</p> : null}
      {result.token ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <InviteLinkShareControls inviteToken={result.token} onCopySuccess={onCopied} onCopyFail={onCopyFail} />
        </div>
      ) : null}
    </div>
  );
}

export function InviteSuperAdminForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ token?: string; expiresAt?: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback(null);
    setResult(null);
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid email is required.');
      return;
    }
    setSubmitting(true);
    try {
      const invite = httpsCallable<{ email: string; displayName?: string }, { token?: string; expiresAt?: string }>(
        getFunctions(app),
        'adminInviteSuperAdmin'
      );
      const res = await invite({ email, displayName: form.displayName.trim() || undefined });
      setResult({ token: res.data.token, expiresAt: res.data.expiresAt });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(callableErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard topBar="accent" className="mb-6">
      <form onSubmit={submit}>
        <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">Invite super admin</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Sends an email with a secure link — same flow as inviting a school principal. They set their password on first open, then join
          the Admin console. Existing accounts skip password setup and get access immediately on accept.
        </p>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {result && (
          <InviteSent
            result={result}
            feedback={feedback}
            onCopied={() => {
              setError('');
              setFeedback('Invite link copied. Paste into SMS, WhatsApp, or email.');
              window.setTimeout(() => setFeedback(null), 5000);
            }}
            onCopyFail={(url) => setError(`Could not copy to clipboard. Send this link manually: ${url}`)}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={INPUT}
              placeholder="admin@school.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className={LABEL}>Display name (optional)</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className={INPUT}
              placeholder="e.g. Jane Smith"
              autoComplete="name"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
