import { useEffect, useState } from 'react';
import type { Child } from 'shared/types';
import type { ConfirmedParentAssignment } from '@/components/ParentLinkOrInvitePanel';
import { assignParents, createChild, updateChild } from '@/services/children';
import { childFieldsFromForm, EMPTY_CHILD_FORM, formFromChild, isChildFormValid, type ChildFormState } from './childForm';

type Options = {
  schoolId: string | undefined;
  children: Child[];
  setChildren: React.Dispatch<React.SetStateAction<Child[]>>;
  editIdFromUrl: string | null | undefined;
  loading: boolean;
};

export function useChildEditor({ schoolId, children, setChildren, editIdFromUrl, loading }: Options) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChildFormState>(EMPTY_CHILD_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [pendingParents, setPendingParents] = useState<ConfirmedParentAssignment[]>([]);

  useEffect(() => {
    if (!editIdFromUrl || loading) return;
    const child = children.find((c) => c.id === editIdFromUrl);
    if (!child) return;
    setEditingId(child.id);
    setForm(formFromChild(child));
    setShowForm(true);
  }, [editIdFromUrl, loading, children]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_CHILD_FORM);
    setPendingParents([]);
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setPendingParents([]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !isChildFormValid(form)) return;
    setSubmitting(true);
    try {
      const fields = childFieldsFromForm(form);
      if (editingId) {
        await updateChild(schoolId, children.find((c) => c.id === editingId), editingId, fields);
        setChildren((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...fields } : c)));
        setEditingId(null);
      } else {
        const created = await createChild(schoolId, fields);
        const parentError = await assignParents(created.id, pendingParents);
        setChildren((prev) => [...prev, created]);
        if (parentError) alert(`Child was added, but linking a parent failed: ${parentError}`);
      }
      setForm(EMPTY_CHILD_FORM);
      close();
    } finally {
      setSubmitting(false);
    }
  };

  return { showForm, editingId, form, setForm, submitting, pendingParents, setPendingParents, openNew, close, save };
}
