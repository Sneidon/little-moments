import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '@/config/firebase';

type PeekInviteResponse =
  | { status: 'not_found' }
  | { status: 'used'; role?: string }
  | { status: 'expired'; role?: string }
  | { status: 'pending'; role?: string; accountExists?: boolean; email?: string };

type AcceptInviteResponse = {
  ok: true;
  principalUid?: string;
  superAdminUid?: string;
  teacherUid?: string;
  parentUid?: string;
  customToken?: string;
  existingAccount?: boolean;
};

export type InvitePrecheck =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; role?: string; accountExists?: boolean; email?: string }
  | { kind: 'already_used'; role?: string }
  | { kind: 'expired' }
  | { kind: 'not_found' };

function isAlreadyAccepted(err: unknown): boolean {
  const msg = (err instanceof FirebaseError || err instanceof Error ? err.message : '').toLowerCase();
  return msg.includes('already been accepted') || msg.includes('invite token already used');
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  if (err && typeof err === 'object' && 'details' in err) return String((err as { details: unknown }).details);
  return 'Failed to accept invite';
}

function precheckFrom(d: PeekInviteResponse): InvitePrecheck {
  if (d.status === 'used') return { kind: 'already_used', role: d.role };
  if (d.status === 'expired') return { kind: 'expired' };
  if (d.status === 'not_found') return { kind: 'not_found' };
  return { kind: 'ok', role: d.role, accountExists: Boolean(d.accountExists), email: d.email };
}

export function useAcceptInvite(token: string) {
  const router = useRouter();
  const [precheck, setPrecheck] = useState<InvitePrecheck>({ kind: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [appOnlyRole, setAppOnlyRole] = useState<'teacher' | 'parent' | null>(null);
  const [joinedExisting, setJoinedExisting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPrecheck({ kind: 'ok' });
      return;
    }
    setPrecheck({ kind: 'loading' });
    let cancelled = false;
    httpsCallable<{ token: string }, PeekInviteResponse>(getFunctions(app), 'peekInviteToken')({ token })
      .then((res) => !cancelled && setPrecheck(precheckFrom(res.data)))
      .catch(() => !cancelled && setPrecheck({ kind: 'ok' }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const finish = async (payload: AcceptInviteResponse) => {
    setJoinedExisting(Boolean(payload.existingAccount));
    if ((payload.principalUid || payload.superAdminUid) && payload.customToken) {
      await signInWithCustomToken(auth, payload.customToken);
      setDone(true);
      router.replace(payload.principalUid ? '/principal' : '/admin');
      return;
    }
    if (payload.teacherUid || payload.parentUid) {
      setAppOnlyRole(payload.teacherUid ? 'teacher' : 'parent');
      setDone(true);
    }
  };

  const accept = async (details?: { password: string; displayName?: string }) => {
    setError('');
    if (!token) {
      setError('Missing invite token.');
      return;
    }
    if (details && details.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const call = httpsCallable<{ token: string; password?: string; displayName?: string }, AcceptInviteResponse>(getFunctions(app), 'acceptInviteToken');
      const res = await call({ token, ...details });
      await finish(res.data);
    } catch (err) {
      if (isAlreadyAccepted(err)) {
        setPrecheck((prev) => ({ kind: 'already_used', role: prev.kind === 'ok' ? prev.role : undefined }));
        return;
      }
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return { precheck, submitting, error, done, appOnlyRole, joinedExisting, accept };
}
