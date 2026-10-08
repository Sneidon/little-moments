import type { InviteFormState, InviteStep } from '@/hooks/useParentsManagement';
import { FORM_BOX, FormError, LabeledInput } from './parentFormParts';

type Props = {
  step: InviteStep | undefined;
  childLabel: string;
  form: InviteFormState;
  setForm: React.Dispatch<React.SetStateAction<InviteFormState>>;
  checkLoading?: boolean;
  checkError?: string;
  submitting?: boolean;
  error?: string;
  onCheckEmail: (e: React.FormEvent) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
};

export function ParentInviteSteps(p: Props) {
  const { form, setForm } = p;
  const set = (key: keyof InviteFormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (p.step === 'email') {
    return (
      <form onSubmit={p.onCheckEmail} className={FORM_BOX}>
        <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent — Step 1</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">Enter the parent&apos;s email. We&apos;ll check if they already have an account.</p>
        <FormError message={p.checkError} />
        <LabeledInput label="Email" type="email" value={form.parentEmail} onChange={set('parentEmail')} placeholder="parent@example.com" required />
        <div className="flex gap-2">
          <button type="submit" disabled={p.checkLoading} className="btn-primary">
            {p.checkLoading ? 'Checking…' : 'Check for account'}
          </button>
          <button type="button" onClick={p.onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const linking = p.step === 'link';
  return (
    <form onSubmit={p.onSubmit} className={FORM_BOX}>
      <h3 className="font-medium text-slate-800 dark:text-slate-100">
        {linking ? 'Invite parent — Link existing account' : 'Add parent — Send invite'}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {linking ? (
          <>
            <strong>{form.parentEmail}</strong> already has an account. Link them{p.childLabel}?
          </>
        ) : (
          <>No account found for this email. Send an invite so they can create their account and join{p.childLabel}.</>
        )}
      </p>
      <FormError message={p.error} />
      {!linking && <LabeledInput label="Email" type="email" value={form.parentEmail} readOnly />}
      <LabeledInput
        label="Display name"
        value={form.parentDisplayName}
        onChange={set('parentDisplayName')}
        placeholder={linking ? 'Optional — update how they appear' : 'Optional'}
      />
      <LabeledInput label="Phone" type="tel" value={form.parentPhone} onChange={set('parentPhone')} placeholder="Optional" />
      <div className="flex gap-2">
        <button type="submit" disabled={p.submitting} className="btn-primary">
          {p.submitting ? (linking ? 'Linking…' : 'Sending…') : linking ? 'Link parent' : 'Send invite email'}
        </button>
        <button type="button" onClick={p.onBack} className="btn-secondary">
          Back
        </button>
        <button type="button" onClick={p.onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
