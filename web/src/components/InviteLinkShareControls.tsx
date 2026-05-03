'use client';

import { useState } from 'react';
import { buildInviteAcceptDeepLink } from '@/config/inviteLinks';
import { InviteQrCodeDialog } from '@/components/InviteQrCodeDialog';

export interface InviteLinkShareControlsProps {
  /** Firestore invite doc id (= bearer token used in `?token=`). */
  inviteToken: string;
  disabled?: boolean;
  /** Hide the copy-link button (e.g. admin invites: QR + PDF only). */
  hideCopyLink?: boolean;
  onCopySuccess?: () => void;
  /** Clipboard blocked or unavailable — parent can show URL. */
  onCopyFail?: (inviteUrl: string) => void;
}

const btnClass =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary-200 hover:bg-primary-50/60 hover:text-primary-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-600 dark:hover:bg-slate-700 dark:hover:text-primary-100';

export function InviteLinkShareControls({
  inviteToken,
  disabled,
  hideCopyLink,
  onCopySuccess,
  onCopyFail,
}: InviteLinkShareControlsProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const url = buildInviteAcceptDeepLink(inviteToken);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onCopySuccess?.();
    } catch {
      onCopyFail?.(url);
    }
  };

  return (
    <>
      {!hideCopyLink ? (
        <button type="button" onClick={() => copyLink()} disabled={disabled} className={btnClass}>
          Copy link
        </button>
      ) : null}
      <button type="button" onClick={() => setQrOpen(true)} disabled={disabled} className={btnClass}>
        QR code
      </button>
      <InviteQrCodeDialog open={qrOpen} onClose={() => setQrOpen(false)} inviteUrl={url} />
    </>
  );
}
