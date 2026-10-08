'use client';

import { AttachmentFields, PostFormActions } from '@/components/post-form/AttachmentFields';
import { inputBase } from '@/components/post-form/styles';
import type { UseAnnouncementFormResult } from '@/hooks/useAnnouncementForm';
import type { ClassRoom } from 'shared/types';

export interface AnnouncementFormProps {
  form: UseAnnouncementFormResult;
  classes: ClassRoom[];
}

export function AnnouncementForm({ form, classes }: AnnouncementFormProps) {
  const editing = !!form.editingId;
  return (
    <form onSubmit={form.submit} className="card mb-8 p-6">
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit announcement' : 'New announcement'}</h2>
      <input
        type="text"
        placeholder="Title"
        value={form.title}
        onChange={(e) => form.setTitle(e.target.value)}
        className={`${inputBase} mb-3 w-full`}
      />
      <textarea
        placeholder="Body (optional)"
        value={form.body}
        onChange={(e) => form.setBody(e.target.value)}
        rows={3}
        className={`${inputBase} mb-4 w-full resize-y`}
      />
      <AttachmentFields attachments={form} classes={classes} radioName="target" />
      <PostFormActions
        submitting={form.submitting}
        disabled={!form.canSubmit}
        label={editing ? 'Save changes' : 'Post announcement'}
        busyLabel={editing ? 'Saving…' : 'Posting…'}
        onCancel={form.closeForm}
      />
    </form>
  );
}
