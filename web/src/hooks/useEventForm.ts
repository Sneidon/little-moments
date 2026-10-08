'use client';

import { useCallback, useState } from 'react';
import { savePost, targetFields } from '@/lib/postAttachments';
import type { Event } from 'shared/types';
import { usePostAttachments } from './usePostAttachments';

export type { PendingDocument, PendingLink } from './usePostAttachments';

type Options = { schoolId: string | undefined; createdBy: string; onSuccess?: () => void };

const DEFAULT_DURATION_MINUTES = 60;

function toLocalInput(date: Date | null): string {
  return date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '';
}

function durationOf(event: Event): number {
  if (!event.endAt || !event.startAt) return DEFAULT_DURATION_MINUTES;
  const mins = Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000);
  return mins > 0 ? mins : DEFAULT_DURATION_MINUTES;
}

export function useEventForm({ schoolId, createdBy, onSuccess }: Options) {
  const attachments = usePostAttachments();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { load } = attachments;

  const fill = useCallback(
    (event: Event | null, start = '') => {
      setEditingId(event?.id ?? null);
      setTitle(event?.title ?? '');
      setDescription(event?.description || '');
      setStartAt(event ? toLocalInput(event.startAt ? new Date(event.startAt) : null) : start);
      setDurationMinutes(event ? durationOf(event) : DEFAULT_DURATION_MINUTES);
      load(event);
    },
    [load]
  );

  const closeForm = useCallback(() => {
    fill(null);
    setShowForm(false);
    onSuccess?.();
  }, [fill, onSuccess]);

  const openFormForNew = useCallback(
    (initialDate?: Date) => {
      let start = '';
      if (initialDate) {
        const d = new Date(initialDate);
        d.setHours(9, 0, 0, 0);
        start = toLocalInput(d);
      }
      fill(null, start);
      setShowForm(true);
    },
    [fill]
  );

  const openFormForEdit = useCallback(
    (event: Event) => {
      fill(event);
      setShowForm(true);
    },
    [fill]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !title.trim() || !startAt) return;
    setSubmitting(true);
    try {
      const start = new Date(startAt);
      const schedule = { startAt: start.toISOString(), endAt: new Date(start.getTime() + durationMinutes * 60000).toISOString() };
      const target = targetFields(attachments.targetType, attachments.targetClassIds, !!editingId);
      const fields = editingId
        ? { title: title.trim(), description: description.trim(), ...schedule, ...target }
        : {
            schoolId,
            title: title.trim(),
            ...schedule,
            createdBy,
            createdAt: new Date().toISOString(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...target,
          };
      await savePost('events', schoolId, editingId, fields, attachments);
      closeForm();
    } finally {
      setSubmitting(false);
    }
  };

  return {
    ...attachments,
    title,
    setTitle,
    description,
    setDescription,
    startAt,
    setStartAt,
    durationMinutes,
    setDurationMinutes,
    showForm,
    editingId,
    openFormForNew,
    openFormForEdit,
    closeForm,
    submitting,
    submit,
    canSubmit: !!title.trim() && !!startAt,
  };
}

export type UseEventFormResult = ReturnType<typeof useEventForm>;
