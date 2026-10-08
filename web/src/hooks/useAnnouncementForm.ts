'use client';

import { useCallback, useState } from 'react';
import { savePost, targetFields } from '@/lib/postAttachments';
import type { Announcement } from 'shared/types';
import { usePostAttachments } from './usePostAttachments';

export type { PendingDocument, PendingLink } from './usePostAttachments';

type Options = { schoolId: string | undefined; createdBy: string; onSuccess?: () => void };

export function useAnnouncementForm({ schoolId, createdBy, onSuccess }: Options) {
  const attachments = usePostAttachments();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { load } = attachments;

  const fill = useCallback(
    (announcement: Announcement | null) => {
      setEditingId(announcement?.id ?? null);
      setTitle(announcement?.title ?? '');
      setBody(announcement?.body || '');
      load(announcement);
    },
    [load]
  );

  const closeForm = useCallback(() => {
    fill(null);
    setShowForm(false);
    onSuccess?.();
  }, [fill, onSuccess]);

  const openFormForNew = useCallback(() => {
    fill(null);
    setShowForm(true);
  }, [fill]);

  const openFormForEdit = useCallback(
    (announcement: Announcement) => {
      fill(announcement);
      setShowForm(true);
    },
    [fill]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !title.trim()) return;
    setSubmitting(true);
    try {
      const target = targetFields(attachments.targetType, attachments.targetClassIds, !!editingId);
      const fields = editingId
        ? { title: title.trim(), body: body.trim(), ...target }
        : { schoolId, title: title.trim(), createdBy, createdAt: new Date().toISOString(), ...(body.trim() ? { body: body.trim() } : {}), ...target };
      await savePost('announcements', schoolId, editingId, fields, attachments);
      closeForm();
    } finally {
      setSubmitting(false);
    }
  };

  return {
    ...attachments,
    title,
    setTitle,
    body,
    setBody,
    showForm,
    editingId,
    openFormForNew,
    openFormForEdit,
    closeForm,
    submitting,
    submit,
    canSubmit: !!title.trim(),
  };
}

export type UseAnnouncementFormResult = ReturnType<typeof useAnnouncementForm>;
