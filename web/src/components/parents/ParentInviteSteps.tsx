import { FORM_BOX, FormError, LabeledInput } from './parentFormParts';

export type ParentInviteStep = 'email' | 'link' | 'invite';
export type ParentInviteForm = { parentEmail: string; parentDisplayName: string; parentPhone: string };

export type ParentInviteCopy = {
  emailTitle: string;
  emailIntro: string;
  linkTitle: string;
  linkIntro: (email: string, childLabel: string) => React.ReactNode;
  inviteTitle: string;
  inviteIntro: (email: string, childLabel: string) => React.ReactNode;
  linkButton: string;
  inviteButton: string;
  inviteBusy: string;
};

export const CHILD_PAGE_INVITE_COPY: ParentInviteCopy = {
  emailTitle: 'Invite parent — Step 1',
  emailIntro: "Enter the parent's email. We'll check if they already have an account.",
  linkTitle: 'Invite parent — Link existing account',
  linkIntro: (email, childLabel) => (
    <>
      <strong>{email}</strong> already has an account. Link them{childLabel}?
    </>
  ),
  inviteTitle: 'Add parent — Send invite',
  inviteIntro: (_email, childLabel) => <>No account found for this email. Send an invite so they can create their account and join{childLabel}.</>,
  linkButton: 'Link parent',
  inviteButton: 'Send invite email',
  inviteBusy: 'Sending…',
};

type Props = {
  step: ParentInviteStep | undefined;
  childLabel: string;
  form: ParentInviteForm;
  setForm: React.Dispatch<React.SetStateAction<ParentInviteForm>>;
  copy?: ParentInviteCopy;
  checkLoading?: boolean;
  checkError?: string;
  submitting?: boolean;
  error?: string;
  onCheckEmail: (e: React.FormEvent) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel?: () => void;
};

export function ParentInviteSteps({ copy = CHILD_PAGE_INVITE_COPY, ...p }: Props) {
  const { form, setForm } = p;
  const set = (key: keyof ParentInviteForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const cancel = p.onCancel ? (
    <button type="button" onClick={p.onCancel} className="btn-secondary">
      Cancel
    </button>
  ) : null;

  if (p.step === 'email') {
    return (
      <form onSubmit={p.onCheckEmail} className={FORM_BOX}>
        <h3 className="font-medium text-slate-800 dark:text-slate-100">{copy.emailTitle}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{copy.emailIntro}</p>
        <FormError message={p.checkError} />
        <LabeledInput label="Email" type="email" value={form.parentEmail} onChange={set('parentEmail')} placeholder="parent@example.com" required />
        <div className="flex gap-2">
          <button type="submit" disabled={p.checkLoading} className="btn-primary">
            {p.checkLoading ? 'Checking…' : 'Check for account'}
          </button>
          {cancel}
        </div>
      </form>
    );
  }

  const linking = p.step === 'link';
  return (
    <form onSubmit={p.onSubmit} className={FORM_BOX}>
      <h3 className="font-medium text-slate-800 dark:text-slate-100">{linking ? copy.linkTitle : copy.inviteTitle}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {(linking ? copy.linkIntro : copy.inviteIntro)(form.parentEmail, p.childLabel)}
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
          {p.submitting ? (linking ? 'Linking…' : copy.inviteBusy) : linking ? copy.linkButton : copy.inviteButton}
        </button>
        <button type="button" onClick={p.onBack} className="btn-secondary">
          Back
        </button>
        {cancel}
      </div>
    </form>
  );
}
