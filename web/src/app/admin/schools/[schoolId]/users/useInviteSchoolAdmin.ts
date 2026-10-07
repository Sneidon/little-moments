import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import type { InviteSchoolAdminFormState } from '@/hooks/useStaffPage';

const EMPTY_FORM: InviteSchoolAdminFormState = { principalEmail: '', principalName: '' };

function messageOf(err: unknown): string {
  return err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Something went wrong';
}

export function useInviteSchoolAdmin(schoolId: string | undefined) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ expiresAt: string } | null>(null);

  const show = () => {
    setOpen(true);
    setError('');
    setResult(null);
  };

  const close = () => {
    setOpen(false);
    setError('');
    setResult(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setError('');
    if (!form.principalEmail.trim()) {
      setError('Email is required.');
      return;
    }
    setSubmitting(true);
    try {
      const invite = httpsCallable<{ schoolId: string; principalEmail: string; principalName?: string }, { expiresAt?: string }>(
        getFunctions(app),
        'inviteSchoolPrincipal'
      );
      const res = await invite({ schoolId, principalEmail: form.principalEmail.trim(), principalName: form.principalName.trim() || undefined });
      setResult({ expiresAt: res.data.expiresAt || '' });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSubmitting(false);
    }
  };

  return { open, form, setForm, error, submitting, result, show, close, submit };
}
