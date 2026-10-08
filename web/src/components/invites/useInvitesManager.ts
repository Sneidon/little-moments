import { useCallback, useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { callableErrorMessage as errorMessage } from '@/lib/errors';
import type { InviteBase } from './inviteUtils';
import { useTimedBanner } from './useTimedBanner';

type Options<T> = {
  load: () => Promise<T[]>;
  resendCallable: (invite: T) => string;
  resendSuccess: string;
  pdfError: string;
};

type BusyMap = Record<string, boolean>;

function callInviteFunction(name: string, inviteId: string) {
  return httpsCallable<{ inviteId: string }, { ok: boolean }>(getFunctions(app), name)({ inviteId });
}

export function useInvitesManager<T extends InviteBase>({ load, resendCallable, resendSuccess, pdfError }: Options<T>) {
  const [invites, setInvites] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<BusyMap>({});
  const [deleting, setDeleting] = useState<BusyMap>({});
  const [generatingPdf, setGeneratingPdf] = useState<BusyMap>({});
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const banner = useTimedBanner();

  const reload = useCallback(async () => setInvites(await load()), [load]);

  useEffect(() => {
    reload()
      .catch((err) => setError(errorMessage(err, 'Failed to load invitations')))
      .finally(() => setLoading(false));
  }, [reload]);

  const track = async (setBusy: React.Dispatch<React.SetStateAction<BusyMap>>, id: string, work: () => Promise<void>) => {
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await work();
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  const resend = (invite: T) => {
    setError(null);
    banner.dismiss();
    return track(setResending, invite.id, async () => {
      try {
        await callInviteFunction(resendCallable(invite), invite.id);
        await reload();
        banner.show(resendSuccess);
      } catch (err) {
        setError(errorMessage(err, 'Failed to resend invite'));
      }
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const invite = pendingDelete;
    setPendingDelete(null);
    setError(null);
    return track(setDeleting, invite.id, async () => {
      try {
        await callInviteFunction('deleteInviteToken', invite.id);
        await reload();
        banner.show('Invite deleted.');
      } catch (err) {
        setError(errorMessage(err, 'Failed to delete invite'));
      }
    });
  };

  const downloadPdf = (invite: T, generate: (invite: T) => Promise<void>) => {
    setError(null);
    return track(setGeneratingPdf, invite.id, async () => {
      try {
        await generate(invite);
        banner.show('PDF downloaded with invite details and QR.');
      } catch {
        setError(pdfError);
      }
    });
  };

  const isBusy = (id: string) => Boolean(resending[id] || deleting[id]);

  return {
    invites,
    loading,
    error,
    setError,
    banner,
    resending,
    deleting,
    generatingPdf,
    isBusy,
    pendingDelete,
    setPendingDelete,
    resend,
    confirmDelete,
    downloadPdf,
  };
}

export type InvitesManager<T extends InviteBase> = ReturnType<typeof useInvitesManager<T>>;
