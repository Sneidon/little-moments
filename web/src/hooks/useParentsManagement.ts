'use client';

import { useState, useCallback } from 'react';
import type { Child } from 'shared/types';
import type { UserProfile } from 'shared/types';
import { checkParentEmail, inviteParentToChild, updateParent, refetchChild, getCallableErrorMessage } from '@/services/parents';
import { MAX_PARENTS } from '@/constants/parents';

export interface InviteFormState {
  parentEmail: string;
  parentDisplayName: string;
  parentPhone: string;
  parentPassword: string;
}

export interface EditFormState {
  displayName: string;
  phone: string;
  isActive: boolean;
}

export interface UseParentsManagementOptions {
  child: Child | null;
  schoolId: string | undefined;
  parents: UserProfile[];
  refetchParents: () => Promise<void>;
  setChild: (c: Child | null) => void;
}

export type InviteStep = 'email' | 'link' | 'create';

export interface UseParentsManagementResult {
  showInviteParent: boolean;
  setShowInviteParent: (show: boolean) => void;
  inviteForm: InviteFormState;
  setInviteForm: React.Dispatch<React.SetStateAction<InviteFormState>>;
  inviteStep: InviteStep;
  inviteCheckLoading: boolean;
  inviteCheckError: string;
  handleCheckEmail: (e: React.FormEvent) => Promise<void>;
  resetInviteToStep1: () => void;
  inviteSubmitting: boolean;
  inviteError: string;
  setInviteError: React.Dispatch<React.SetStateAction<string>>;
  handleInviteParent: (e: React.FormEvent) => Promise<void>;
  editingParentUid: string | null;
  editParentForm: EditFormState;
  setEditParentForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  editParentSubmitting: boolean;
  editParentError: string;
  startEditParent: (p: UserProfile) => void;
  handleUpdateParent: (e: React.FormEvent) => Promise<void>;
  cancelEditParent: () => void;
  canInviteMore: boolean;
  maxParents: number;
}

const INITIAL_INVITE_FORM: InviteFormState = {
  parentEmail: '',
  parentDisplayName: '',
  parentPhone: '',
  parentPassword: '',
};

export function useParentsManagement(options: UseParentsManagementOptions): UseParentsManagementResult {
  const { child, schoolId, parents, refetchParents, setChild } = options;
  const [showInviteParent, setShowInviteParent] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(INITIAL_INVITE_FORM);
  const [inviteStep, setInviteStep] = useState<InviteStep>('email');
  const [inviteCheckLoading, setInviteCheckLoading] = useState(false);
  const [inviteCheckError, setInviteCheckError] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [editingParentUid, setEditingParentUid] = useState<string | null>(null);

  const setShowInviteParentWithReset = useCallback((show: boolean) => {
    setShowInviteParent(show);
    if (show) {
      setInviteStep('email');
      setInviteCheckError('');
      setInviteError('');
    }
  }, []);

  const resetInviteToStep1 = useCallback(() => {
    setInviteStep('email');
    setInviteCheckError('');
    setInviteError('');
  }, []);
  const [editParentForm, setEditParentForm] = useState<EditFormState>({
    displayName: '',
    phone: '',
    isActive: true,
  });
  const [editParentSubmitting, setEditParentSubmitting] = useState(false);
  const [editParentError, setEditParentError] = useState('');

  const startEditParent = useCallback((p: UserProfile) => {
    setEditingParentUid(p.uid);
    setEditParentError('');
    setEditParentForm({
      displayName: p.displayName ?? '',
      phone: p.phone ?? '',
      isActive: p.isActive !== false,
    });
  }, []);

  const cancelEditParent = useCallback(() => {
    setEditingParentUid(null);
    setEditParentError('');
  }, []);

  const handleUpdateParent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingParentUid) return;
      setEditParentError('');
      setEditParentSubmitting(true);
      try {
        await updateParent({
          parentUid: editingParentUid,
          displayName: editParentForm.displayName.trim() || undefined,
          phone: editParentForm.phone.trim() || undefined,
          isActive: editParentForm.isActive,
        });
        await refetchParents();
        setEditingParentUid(null);
      } catch (err) {
        setEditParentError(getCallableErrorMessage(err));
      } finally {
        setEditParentSubmitting(false);
      }
    },
    [editingParentUid, editParentForm, refetchParents]
  );

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
        const { exists } = await checkParentEmail(inviteForm.parentEmail.trim());
        setInviteStep(exists ? 'link' : 'create');
      } catch (err) {
        setInviteCheckError(getCallableErrorMessage(err));
      } finally {
        setInviteCheckLoading(false);
      }
    },
    [inviteForm.parentEmail]
  );

  const handleInviteParent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteError('');
      if (!child || !inviteForm.parentEmail?.trim()) {
        setInviteError('Email is required.');
        return;
      }
      if ((child.parentIds?.length ?? 0) >= MAX_PARENTS) {
        setInviteError(`Maximum ${MAX_PARENTS} parents allowed.`);
        return;
      }
      if (inviteStep === 'create' && (!inviteForm.parentPassword || inviteForm.parentPassword.length < 6)) {
        setInviteError('Password (min 6 characters) is required for new accounts.');
        return;
      }
      setInviteSubmitting(true);
      try {
        await inviteParentToChild({
          childId: child.id,
          parentEmail: inviteForm.parentEmail.trim(),
          parentDisplayName: inviteForm.parentDisplayName.trim() || undefined,
          parentPhone: inviteForm.parentPhone.trim() || undefined,
          parentPassword: inviteStep === 'create' ? inviteForm.parentPassword?.trim() : undefined,
        });
        if (schoolId) {
          const updated = await refetchChild(schoolId, child.id);
          if (updated) setChild(updated);
        }
        setInviteForm(INITIAL_INVITE_FORM);
        setShowInviteParent(false);
      } catch (err) {
        setInviteError(getCallableErrorMessage(err));
      } finally {
        setInviteSubmitting(false);
      }
    },
    [child, schoolId, inviteForm, inviteStep, setChild]
  );

  const parentCount = child?.parentIds?.length ?? 0;
  const canInviteMore = parentCount < MAX_PARENTS;

  return {
    showInviteParent,
    setShowInviteParent: setShowInviteParentWithReset,
    inviteForm,
    setInviteForm,
    inviteStep,
    inviteCheckLoading,
    inviteCheckError,
    handleCheckEmail,
    resetInviteToStep1,
    inviteSubmitting,
    inviteError,
    setInviteError,
    handleInviteParent,
    editingParentUid,
    editParentForm,
    setEditParentForm,
    editParentSubmitting,
    editParentError,
    startEditParent,
    handleUpdateParent,
    cancelEditParent,
    canInviteMore,
    maxParents: MAX_PARENTS,
  };
}
