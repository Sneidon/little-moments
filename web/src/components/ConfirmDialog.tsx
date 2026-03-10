'use client';

import React from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={onClose}
    >
      <div
        className="dialog-panel-top"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="dialog-title">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="dialog-description">
          {message}
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="btn-primary disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
