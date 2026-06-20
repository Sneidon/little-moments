'use client';

import { useCallback, useState } from 'react';
import { checkParentEmail, getCallableErrorMessage } from '@/services/parents';

export interface ConfirmedParentAssignment {
  parentEmail: string;
  parentDisplayName?: string;
  parentPhone?: string;
  mode: 'link' | 'invite';
}

type PanelStep = 'email' | 'link' | 'invite';

interface ParentFormState {
  parentEmail: string;
  parentDisplayName: string;
  parentPhone: string;
}

const INITIAL_FORM: ParentFormState = {
  parentEmail: '',
  parentDisplayName: '',
  parentPhone: '',
};

export interface ParentLinkOrInvitePanelProps {
  childLabel?: string;
  onConfirm: (parent: ConfirmedParentAssignment) => void | Promise<void>;
  onCancel?: () => void;
  confirmLinkLabel?: string;
  confirmInviteLabel?: string;
  submitting?: boolean;
  externalError?: string;
}

export function ParentLinkOrInvitePanel({
  childLabel = ' to this child',
  onConfirm,
  onCancel,
  confirmLinkLabel = 'Link parent',
  confirmInviteLabel = 'Send invite email',
  submitting = false,
  externalError,
}: ParentLinkOrInvitePanelProps) {
  const [inviteForm, setInviteForm] = useState<ParentFormState>(INITIAL_FORM);
  const [inviteStep, setInviteStep] = useState<PanelStep>('email');
  const [inviteCheckLoading, setInviteCheckLoading] = useState(false);
  const [inviteCheckError, setInviteCheckError] = useState('');
  const [inviteError, setInviteError] = useState('');

  const resetToEmailStep = useCallback(() => {
    setInviteStep('email');
    setInviteCheckError('');
    setInviteError('');
  }, []);

  const handleCancel = useCallback(() => {
    setInviteForm(INITIAL_FORM);
    resetToEmailStep();
    onCancel?.();
  }, [onCancel, resetToEmailStep]);

  const handleCheckEmail = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteCheckError('');
      if (!inviteForm.parentEmail?.trim()) {
        setInviteCheckError('Email is required.');
        return;
      }
      setInviteCheckLoading(true);
      try {
        const { exists } = await checkParentEmail(inviteForm.parentEmail.trim());
        setInviteStep(exists ? 'link' : 'invite');
      } catch (err) {
        setInviteCheckError(getCallableErrorMessage(err));
      } finally {
        setInviteCheckLoading(false);
      }
    },
    [inviteForm.parentEmail]
  );

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteError('');
      const emailTrim = inviteForm.parentEmail?.trim();
      if (!emailTrim) {
        setInviteError('Email is required.');
        return;
      }
      try {
        await onConfirm({
          parentEmail: emailTrim,
          parentDisplayName: inviteForm.parentDisplayName.trim() || undefined,
          parentPhone: inviteForm.parentPhone.trim() || undefined,
          mode: inviteStep === 'link' ? 'link' : 'invite',
        });
        setInviteForm(INITIAL_FORM);
        resetToEmailStep();
      } catch (err) {
        setInviteError(getCallableErrorMessage(err));
      }
    },
    [inviteForm, inviteStep, onConfirm, resetToEmailStep]
  );

  const displayError = externalError || inviteError;

  if (inviteStep === 'email') {
    return (
      <form
        onSubmit={handleCheckEmail}
        className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
      >
        <h3 className="font-medium text-slate-800 dark:text-slate-100">Add parent — Step 1</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Enter the parent&apos;s email. We&apos;ll check if they already have an account. Existing parents are
          linked immediately; new emails receive an invite.
        </p>
        {inviteCheckError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{inviteCheckError}</p>
        ) : null}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={inviteForm.parentEmail}
            onChange={(e) => setInviteForm((f) => ({ ...f, parentEmail: e.target.value }))}
            className="input-base"
            placeholder="parent@example.com"
            required
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={inviteCheckLoading} className="btn-primary">
            {inviteCheckLoading ? 'Checking…' : 'Check for account'}
          </button>
          {onCancel ? (
            <button type="button" onClick={handleCancel} className="btn-secondary">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  if (inviteStep === 'link') {
    return (
      <form
        onSubmit={handleConfirm}
        className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
      >
        <h3 className="font-medium text-slate-800 dark:text-slate-100">Add parent — Link existing account</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <strong>{inviteForm.parentEmail}</strong> already has an account. Link them{childLabel} now — no invite
          email will be sent.
        </p>
        {displayError ? <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p> : null}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Display name
          </label>
          <input
            type="text"
            value={inviteForm.parentDisplayName}
            onChange={(e) => setInviteForm((f) => ({ ...f, parentDisplayName: e.target.value }))}
            className="input-base"
            placeholder="Optional — update how they appear"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
          <input
            type="tel"
            value={inviteForm.parentPhone}
            onChange={(e) => setInviteForm((f) => ({ ...f, parentPhone: e.target.value }))}
            className="input-base"
            placeholder="Optional"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Linking…' : confirmLinkLabel}
          </button>
          <button type="button" onClick={resetToEmailStep} className="btn-secondary">
            Back
          </button>
          {onCancel ? (
            <button type="button" onClick={handleCancel} className="btn-secondary">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleConfirm}
      className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
    >
      <h3 className="font-medium text-slate-800 dark:text-slate-100">Add parent — Send invite</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        No account found for <strong>{inviteForm.parentEmail}</strong>. An invite email will be sent so they can
        create their account and join{childLabel}.
      </p>
      {displayError ? <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p> : null}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          type="email"
          value={inviteForm.parentEmail}
          readOnly
          className="input-base cursor-not-allowed bg-slate-100 dark:bg-slate-700"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
        <input
          type="text"
          value={inviteForm.parentDisplayName}
          onChange={(e) => setInviteForm((f) => ({ ...f, parentDisplayName: e.target.value }))}
          className="input-base"
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
        <input
          type="tel"
          value={inviteForm.parentPhone}
          onChange={(e) => setInviteForm((f) => ({ ...f, parentPhone: e.target.value }))}
          className="input-base"
          placeholder="Optional"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : confirmInviteLabel}
        </button>
        <button type="button" onClick={resetToEmailStep} className="btn-secondary">
          Back
        </button>
        {onCancel ? (
          <button type="button" onClick={handleCancel} className="btn-secondary">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
