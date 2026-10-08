import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { callableErrorMessage } from '@/lib/errors';
import { SectionCard } from '@/components/ui';
import { Field } from './fields';

const EMPTY = { schoolName: '', principalName: '', principalEmail: '' };
type InviteResult = { token: string; expiresAt: string; schoolName: string };

export function InvitePrincipalForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!form.schoolName.trim() || !form.principalEmail.trim()) {
      setError('School name and principal email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const invite = httpsCallable<{ schoolName: string; principalName?: string; principalEmail: string }, InviteResult>(
        getFunctions(app),
        'adminInvitePrincipal'
      );
      const res = await invite({
        schoolName: form.schoolName.trim(),
        principalName: form.principalName.trim() || undefined,
        principalEmail: form.principalEmail.trim(),
      });
      setResult(res.data);
      setForm(EMPTY);
    } catch (err) {
      setError(callableErrorMessage(err, 'Failed to send invite'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard topBar="accent" className="mb-8">
      <form onSubmit={submit}>
        <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">Invite principal</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Sends an email link to the principal. They set their password on first open.</p>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {result && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
            <p className="font-semibold">Invite sent.</p>
            <p className="mt-1">
              School: <span className="font-mono">{result.schoolName}</span>
            </p>
            <p className="mt-1">
              Expires at: <span className="font-mono">{result.expiresAt}</span>
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School name" value={form.schoolName} onChange={set('schoolName')} placeholder="e.g. St. John's School" required />
          <Field label="Principal name" value={form.principalName} onChange={set('principalName')} placeholder="e.g. Jane Smith" />
          <Field label="Principal email" type="email" value={form.principalEmail} onChange={set('principalEmail')} placeholder="principal@school.com" required />
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
