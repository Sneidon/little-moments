'use client';

import type { PendingDocument, PendingLink, UseEventFormResult } from '@/hooks/useEventForm';
import type { ClassRoom } from 'shared/types';

const inputBase =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const inputFile =
  'text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1 file:text-primary-700';

export interface EventFormProps {
  form: UseEventFormResult;
  classes: ClassRoom[];
}

function DocumentRow({
  docRow,
  index,
  onLabelChange,
  onFileChange,
  onRemove,
}: {
  docRow: PendingDocument;
  index: number;
  onLabelChange: (i: number, v: string) => void;
  onFileChange: (i: number, f: File | null) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Label (e.g. Permission slip)"
        value={docRow.label}
        onChange={(e) => onLabelChange(index, e.target.value)}
        className={`min-w-[140px] flex-1 ${inputBase} py-1.5 text-sm`}
      />
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => onFileChange(index, e.target.files?.[0] ?? null)}
        className={`flex-1 ${inputBase} ${inputFile} py-1.5`}
      />
      {docRow.file && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{docRow.file.name}</span>
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="rounded px-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
        aria-label="Remove document"
      >
        ×
      </button>
    </div>
  );
}

function LinkRow({
  link,
  index,
  onLabelChange,
  onUrlChange,
  onRemove,
}: {
  link: PendingLink;
  index: number;
  onLabelChange: (i: number, v: string) => void;
  onUrlChange: (i: number, v: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Label (e.g. School calendar)"
        value={link.label}
        onChange={(e) => onLabelChange(index, e.target.value)}
        className={`min-w-[120px] flex-1 ${inputBase} py-1.5 text-sm`}
      />
      <input
        type="url"
        placeholder="https://..."
        value={link.url}
        onChange={(e) => onUrlChange(index, e.target.value)}
        className={`min-w-[180px] flex-1 ${inputBase} py-1.5 text-sm`}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="rounded px-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
        aria-label="Remove link"
      >
        ×
      </button>
    </div>
  );
}

export function EventForm({ form, classes }: EventFormProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    startAt,
    setStartAt,
    imageFile,
    setImageFile,
    documents,
    addDocument,
    removeDocument,
    setDocumentLabel,
    setDocumentFile,
    links,
    addLink,
    removeLink,
    setLinkLabel,
    setLinkUrl,
    targetType,
    setTargetType,
    targetClassIds,
    toggleTargetClass,
    submitting,
    submit,
    canSubmit,
  } = form;

  return (
    <form onSubmit={submit} className="card mb-8 p-6">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        New event
      </label>
      <input
        type="text"
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${inputBase} mb-3 w-full`}
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={`${inputBase} mb-3 w-full resize-y`}
      />

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Optional image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className={`${inputBase} w-full text-sm ${inputFile}`}
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Optional documents (upload files; add a label for each)
          </span>
          <button
            type="button"
            onClick={addDocument}
            className="text-sm text-primary-600 hover:underline"
          >
            Add document
          </button>
        </div>
        {documents.map((docRow, i) => (
          <DocumentRow
            key={i}
            docRow={docRow}
            index={i}
            onLabelChange={setDocumentLabel}
            onFileChange={setDocumentFile}
            onRemove={removeDocument}
          />
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Optional links (label + URL for each)
          </span>
          <button
            type="button"
            onClick={addLink}
            className="text-sm text-primary-600 hover:underline"
          >
            Add link
          </button>
        </div>
        {links.map((link, i) => (
          <LinkRow
            key={i}
            link={link}
            index={i}
            onLabelChange={setLinkLabel}
            onUrlChange={setLinkUrl}
            onRemove={removeLink}
          />
        ))}
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Target audience
        </label>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="eventTarget"
              checked={targetType === 'everyone'}
              onChange={() => setTargetType('everyone')}
              className="text-primary-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Everyone</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="eventTarget"
              checked={targetType === 'classes'}
              onChange={() => setTargetType('classes')}
              className="text-primary-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Specific classes</span>
          </label>
          {targetType === 'classes' && classes.length > 0 && (
            <div className="ml-6 mt-1 flex flex-wrap gap-3">
              {classes.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targetClassIds.includes(c.id)}
                    onChange={() => toggleTargetClass(c.id)}
                    className="rounded border-slate-300 text-primary-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Date & time
        </label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className={`${inputBase} w-full`}
        />
      </div>

      <button type="submit" disabled={submitting || !canSubmit} className="btn-primary">
        {submitting ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
