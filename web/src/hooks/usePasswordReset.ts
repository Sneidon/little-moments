import { useCallback, useState } from 'react';
import { requestPasswordResetEmail } from '@/lib/auth';

type Target = { uid: string; email?: string | null };

export function usePasswordReset<T extends Target>() {
  const [pending, setPending] = useState<T | null>(null);
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = useCallback(async (user: T) => {
    const email = user.email?.trim();
    if (!email) return;
    setError('');
    setSentTo(null);
    setPending(null);
    setLoadingUid(user.uid);
    try {
      await requestPasswordResetEmail(email);
      setSentTo(email);
      setTimeout(() => setSentTo(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setLoadingUid(null);
    }
  }, []);

  return {
    pending,
    setPending,
    loadingUid,
    error,
    sentTo,
    send,
    dismissError: () => setError(''),
    dismissSuccess: () => setSentTo(null),
  };
}

export type PasswordResetState<T extends Target> = ReturnType<typeof usePasswordReset<T>>;
