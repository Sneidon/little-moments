'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useParentDetail } from '@/hooks/useParentDetail';
import { requestPasswordResetEmail } from '@/lib/auth';
import { principalDeleteParent, getCallableErrorMessage } from '@/services/parents';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ParentDetailHeader, ParentProfileCard, LinkedChildrenList } from './components';

export default function ParentDetailPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const params = useParams();
  const parentId = params?.parentId as string;
  const { parent, children, classes, loading } = useParentDetail(profile?.schoolId, parentId);
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [showDeleteParentConfirm, setShowDeleteParentConfirm] = useState(false);
  const [deleteParentBusy, setDeleteParentBusy] = useState(false);
  const [deleteParentErrorMsg, setDeleteParentErrorMsg] = useState('');

  const handleRequestPasswordReset = useCallback(async () => {
    if (!parent?.email?.trim()) return;
    setPasswordResetMessage(null);
    setPasswordResetSending(true);
    setShowPasswordResetConfirm(false);
    try {
      await requestPasswordResetEmail(parent.email.trim());
      setPasswordResetMessage({ type: 'success', text: 'Password reset email sent. The parent will receive a link to set a new password.' });
      setTimeout(() => setPasswordResetMessage(null), 5000);
    } catch (err: unknown) {
      setPasswordResetMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send reset email.',
      });
    } finally {
      setPasswordResetSending(false);
    }
  }, [parent?.email]);

  const handleConfirmDeleteParent = useCallback(async () => {
    if (!parent || deleteParentBusy) return;
    setDeleteParentBusy(true);
    setDeleteParentErrorMsg('');
    try {
      await principalDeleteParent(parent.uid);
      setShowDeleteParentConfirm(false);
      router.replace('/principal/parents');
    } catch (err: unknown) {
      setDeleteParentErrorMsg(getCallableErrorMessage(err));
    } finally {
      setDeleteParentBusy(false);
    }
  }, [parent, deleteParentBusy, router]);

  if (loading || !parent) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={showDeleteParentConfirm}
        onClose={() => !deleteParentBusy && setShowDeleteParentConfirm(false)}
        title="Delete this parent?"
        message={
          `Unlink ${parent.displayName ?? parent.email ?? 'this parent'} from all ${children.length} linked ${children.length === 1 ? 'child' : 'children'}, remove their profile, and delete their sign-in permanently? They will not be able to use the app. This cannot be undone.`
        }
        confirmLabel="Delete parent"
        cancelLabel="Cancel"
        confirmDisabled={deleteParentBusy}
        onConfirm={handleConfirmDeleteParent}
      />
      <ConfirmDialog
        open={showPasswordResetConfirm}
        onClose={() => setShowPasswordResetConfirm(false)}
        title="Send password reset email?"
        message={
          parent.email
            ? `Send a password reset link to ${parent.email}? They will receive an email to set a new password.`
            : ''
        }
        confirmLabel="Send reset email"
        confirmDisabled={passwordResetSending}
        onConfirm={handleRequestPasswordReset}
      />
      <ParentDetailHeader
        parent={parent}
        childrenCount={children.length}
        onRequestPasswordReset={() => setShowPasswordResetConfirm(true)}
        passwordResetSending={passwordResetSending}
        onRequestDeleteParent={() => {
          setDeleteParentErrorMsg('');
          setShowDeleteParentConfirm(true);
        }}
        deleteParentDisabled={deleteParentBusy}
      />
      {deleteParentErrorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {deleteParentErrorMsg}
        </div>
      )}
      {passwordResetMessage && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            passwordResetMessage.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
              : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200'
          }`}
        >
          {passwordResetMessage.text}
        </div>
      )}
      <ParentProfileCard parent={parent} />
      <div className="mt-8">
        <LinkedChildrenList children={children} classes={classes} />
      </div>
    </div>
  );
}
