'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface InviteQrCodeDialogProps {
  open: boolean;
  onClose: () => void;
  inviteUrl: string;
  title?: string;
}

export function InviteQrCodeDialog({
  open,
  onClose,
  inviteUrl,
  title = 'Invitation QR code',
}: InviteQrCodeDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !inviteUrl.trim()) {
      setDataUrl(null);
      setGenError(null);
      return undefined;
    }
    let cancelled = false;
    setDataUrl(null);
    setGenError(null);
    void (async () => {
      try {
        const QR = await import('qrcode');
        const pngDataUrl = await QR.default.toDataURL(inviteUrl, {
          width: 248,
          margin: 2,
          color: { dark: '#0f172aff', light: '#ffffffff' },
        });
        if (!cancelled) setDataUrl(pngDataUrl);
      } catch {
        if (!cancelled) setGenError('Could not generate QR code.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, inviteUrl]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-qr-dialog-title"
      onClick={onClose}
    >
      <div
        className="dialog-panel-top max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="invite-qr-dialog-title" className="dialog-title">
          {title}
        </h2>
        <p className="dialog-description text-left text-sm">
          Scan with a phone camera to open the invite. Treat this like a password — anyone who can scan it can use the invite until it expires or is accepted.
        </p>
        <div className="flex flex-col items-center gap-4 py-3">
          {genError ? <p className="text-center text-sm text-red-600 dark:text-red-400">{genError}</p> : null}
          {!genError && !dataUrl ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Generating…</p>
          ) : null}
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="QR code for invitation link"
              width={248}
              height={248}
              className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-600"
            />
          ) : null}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
