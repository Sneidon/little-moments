import { useCallback, useState } from 'react';
import { callableErrorMessage } from '@/lib/errors';

type Options<F> = {
  initial: F;
  validate: (form: F) => string | null;
  send: (form: F) => Promise<{ expiresAt?: string }>;
};

export function useInviteForm<F>({ initial, validate, send }: Options<F>) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ expiresAt: string } | null>(null);

  const reset = useCallback(() => {
    setError('');
    setResult(null);
    setForm(initial);
  }, [initial]);

  const show = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const close = useCallback(() => {
    reset();
    setOpen(false);
  }, [reset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      const res = await send(form);
      setResult({ expiresAt: res.expiresAt || '' });
      setForm(initial);
    } catch (err) {
      setError(callableErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return { open, form, setForm, error, submitting, result, show, close, submit };
}

export type InviteFormState<F> = ReturnType<typeof useInviteForm<F>>;
