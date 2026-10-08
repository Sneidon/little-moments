import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { userHasRole } from '@/lib/roles';
import type { UserProfile } from 'shared/types';
import type { EditTeacherFormState } from './types';

function callableError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
  if (err && typeof err === 'object' && 'details' in err) return String((err as { details: unknown }).details);
  return 'Something went wrong';
}

export function useTeacherEditor(reload: () => Promise<void>) {
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<EditTeacherFormState>({ displayName: '', preferredName: '', isActive: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserProfile | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const start = useCallback((u: UserProfile) => {
    if (userHasRole(u, 'principal') && !userHasRole(u, 'teacher')) return;
    setEditingUid(u.uid);
    setError('');
    setForm({ displayName: u.displayName ?? '', preferredName: u.preferredName ?? '', isActive: u.isActive !== false });
  }, []);

  const cancel = useCallback(() => {
    setEditingUid(null);
    setError('');
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUid) return;
    setError('');
    setSubmitting(true);
    try {
      await httpsCallable<{ teacherUid: string; displayName?: string; preferredName?: string; isActive?: boolean }, { ok: boolean }>(
        getFunctions(app),
        'updateTeacher'
      )({
        teacherUid: editingUid,
        displayName: form.displayName.trim() || undefined,
        preferredName: form.preferredName.trim() || undefined,
        isActive: form.isActive,
      });
      await reload();
      setEditingUid(null);
    } catch (err) {
      setError(callableError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deletingUid) return;
    const uid = pendingDelete.uid;
    setDeleteError('');
    setDeletingUid(uid);
    try {
      await httpsCallable<{ teacherUid: string }, { ok: boolean }>(getFunctions(app), 'principalDeleteTeacher')({ teacherUid: uid });
      await reload();
      setEditingUid((prev) => (prev === uid ? null : prev));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(callableError(err));
    } finally {
      setDeletingUid(null);
    }
  };

  return { editingUid, form, setForm, error, submitting, start, cancel, save, pendingDelete, setPendingDelete, deletingUid, deleteError, confirmDelete };
}
