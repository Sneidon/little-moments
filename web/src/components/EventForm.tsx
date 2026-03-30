'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PendingDocument, PendingLink, UseEventFormResult } from '@/hooks/useEventForm';
import type { ClassRoom } from 'shared/types';

const inputBase =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const inputFile =
  'text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1 file:text-primary-700';

const btnGhost =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

function formatScheduleSummary(startAt: string, durationMinutes: number): string {
  if (!startAt) return '—';
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return '—';
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startStr = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const endStr = end.toLocaleTimeString(undefined, { timeStyle: 'short' });
  return `${startStr} – ${endStr}`;
}

function audienceSummary(
  targetType: 'everyone' | 'classes',
  targetClassIds: string[],
  classNamesMap: Record<string, string>
): string {
  if (targetType === 'everyone') return 'Everyone';
  if (!targetClassIds.length) return '—';
  return targetClassIds.map((id) => classNamesMap[id] || id).join(', ');
}

export interface EventFormProps {
  form: UseEventFormResult;
  classes: ClassRoom[];
  classNamesMap?: Record<string, string>;
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
      {docRow.existingUrl && !docRow.file && (
        <a
          href={docRow.existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          View current file
        </a>
      )}
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => onFileChange(index, e.target.files?.[0] ?? null)}
        className={`min-w-[160px] flex-1 ${inputBase} ${inputFile} py-1.5`}
        title={docRow.existingUrl ? 'Choose a file to replace the current attachment' : undefined}
      />
      {docRow.file && (
        <span className="text-xs text-slate-500 dark:text-slate-400">New: {docRow.file.name}</span>
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

export function EventForm({ form, classes, classNamesMap = {} }: EventFormProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    startAt,
    setStartAt,
    durationMinutes,
    setDurationMinutes,
    imageFile,
    setImageFile,
    existingImageUrl,
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
    editingId,
    closeForm,
    submitting,
    submit,
    canSubmit,
  } = form;

  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  useEffect(() => {
    if (!imageFile) {
      setNewImagePreview(null);
      return;
    }
    const u = URL.createObjectURL(imageFile);
    setNewImagePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  return (
    <form onSubmit={submit} className="card mb-8 p-6">
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
        {editingId ? 'Edit event' : 'New event'}
      </h2>

      {editingId && (
        <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-600 dark:bg-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Event details
          </p>
          <dl className="grid gap-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-300">When</dt>
                <dd className="mt-0.5 text-slate-900 dark:text-slate-100">
                  {formatScheduleSummary(startAt, durationMinutes)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-300">Audience</dt>
                <dd className="mt-0.5 text-slate-900 dark:text-slate-100">
                  {audienceSummary(targetType, targetClassIds, classNamesMap)}
                </dd>
              </div>
            </div>
            <div>
              <dt className="font-medium text-slate-600 dark:text-slate-300">Description</dt>
              <dd className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                {description.trim() ? description : <span className="text-slate-400">No description</span>}
              </dd>
            </div>
            {(existingImageUrl || documents.some((d) => d.existingUrl || d.file) || links.some((l) => l.url.trim())) && (
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-300">Attachments & links</dt>
                <dd className="mt-1 space-y-2">
                  {existingImageUrl && !imageFile && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Event image below (replace using the image field).
                    </p>
                  )}
                  <ul className="list-inside list-disc space-y-1 text-slate-800 dark:text-slate-200">
                    {documents.map((d, i) => {
                      const label = d.label?.trim() || `Document ${i + 1}`;
                      if (d.existingUrl) {
                        return (
                          <li key={`d-${i}-e`}>
                            <a
                              href={d.existingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline dark:text-primary-400"
                            >
                              {label}
                            </a>
                            <span className="text-slate-400"> (file)</span>
                          </li>
                        );
                      }
                      if (d.file) {
                        return (
                          <li key={`d-${i}-n`}>
                            {label}
                            <span className="text-slate-400"> — new upload: {d.file.name}</span>
                          </li>
                        );
                      }
                      return null;
                    })}
                    {links.map((l, i) =>
                      l.url.trim() ? (
                        <li key={`l-${i}`}>
                          <a
                            href={l.url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {l.label?.trim() || l.url.trim()}
                          </a>
                          <span className="text-slate-400"> (link)</span>
                        </li>
                      ) : null
                    )}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-600">
            <Link href={`/principal/events/${editingId}/rsvps`} className={btnGhost}>
              View RSVP responses
            </Link>
          </div>
        </div>
      )}

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
        rows={4}
        className={`${inputBase} mb-3 w-full resize-y`}
      />

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Optional image
        </label>
        {existingImageUrl && !imageFile && (
          <div className="mb-2">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Current image</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingImageUrl}
              alt=""
              className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
            />
          </div>
        )}
        {newImagePreview && (
          <div className="mb-2">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">New image preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={newImagePreview}
              alt=""
              className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
            />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className={`${inputBase} w-full text-sm ${inputFile}`}
          title={existingImageUrl ? 'Choose an image to replace the current one' : undefined}
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Optional documents (labels, upload or replace files; remove a row to delete an attachment)
          </span>
          <button type="button" onClick={addDocument} className="text-sm text-primary-600 hover:underline">
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
            Optional links (edit label or URL; remove a row to delete)
          </span>
          <button type="button" onClick={addLink} className="text-sm text-primary-600 hover:underline">
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

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Duration
          </label>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={`${inputBase} w-full`}
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
            <option value={480}>All day (8 hours)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting || !canSubmit} className="btn-primary">
          {submitting ? (editingId ? 'Saving…' : 'Creating…') : editingId ? 'Save changes' : 'Create event'}
        </button>
        <button
          type="button"
          onClick={closeForm}
          className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
