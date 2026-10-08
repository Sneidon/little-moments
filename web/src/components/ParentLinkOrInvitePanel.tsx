'use client';

import { useCallback, useState } from 'react';
import { checkParentEmail, getCallableErrorMessage } from '@/services/parents';
import { nonParentEmailError } from '@/constants/parents';
import { ParentInviteSteps, type ParentInviteCopy, type ParentInviteForm, type ParentInviteStep } from '@/components/parents/ParentInviteSteps';

export interface ConfirmedParentAssignment {
  parentEmail: string;
  parentDisplayName?: string;
  parentPhone?: string;
  mode: 'link' | 'invite';
}

const INITIAL_FORM: ParentInviteForm = {
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
  const [inviteForm, setInviteForm] = useState<ParentInviteForm>(INITIAL_FORM);
  const [inviteStep, setInviteStep] = useState<ParentInviteStep>('email');
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
        const result = await checkParentEmail(inviteForm.parentEmail.trim());
        if (result.exists && result.canLink === false) {
          setInviteCheckError(nonParentEmailError(result.existingRole ?? 'staff'));
          return;
        }
        setInviteStep(result.exists ? 'link' : 'invite');
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

  const copy: ParentInviteCopy = {
    emailTitle: 'Add parent — Step 1',
    emailIntro:
      "Enter the parent's email. We'll check if they already have a parent account. Existing parents are linked immediately; new emails receive an invite.",
    linkTitle: 'Add parent — Link existing account',
    linkIntro: (email, label) => (
      <>
        <strong>{email}</strong> already has a parent account. Link them{label} now — no invite email will be sent.
      </>
    ),
    inviteTitle: 'Add parent — Send invite',
    inviteIntro: (email, label) => (
      <>
        No account found for <strong>{email}</strong>. An invite email will be sent so they can create their account and join{label}.
      </>
    ),
    linkButton: confirmLinkLabel,
    inviteButton: confirmInviteLabel,
    inviteBusy: 'Adding…',
  };

  return (
    <ParentInviteSteps
      step={inviteStep}
      childLabel={childLabel}
      form={inviteForm}
      setForm={setInviteForm}
      copy={copy}
      checkLoading={inviteCheckLoading}
      checkError={inviteCheckError}
      submitting={submitting}
      error={externalError || inviteError}
      onCheckEmail={handleCheckEmail}
      onSubmit={handleConfirm}
      onBack={resetToEmailStep}
      onCancel={onCancel ? handleCancel : undefined}
    />
  );
}
