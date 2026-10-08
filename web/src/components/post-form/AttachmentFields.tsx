import { MediaUploadSection } from '@/components/MediaUploadSection';
import type { PostAttachments } from '@/hooks/usePostAttachments';
import { inputBase, inputFile } from './styles';

const REMOVE = 'rounded px-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600';
const DOC_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function SectionHeader({ label, action, onAction }: { label: string; action: string; onAction: () => void }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <button type="button" onClick={onAction} className="text-sm text-primary-600 hover:underline">
        {action}
      </button>
    </div>
  );
}

function DocumentsField({ a }: { a: PostAttachments }) {
  return (
    <div className="mb-4">
      <SectionHeader
        label="Optional documents (labels, upload or replace files; remove a row to delete an attachment)"
        action="Add document"
        onAction={a.addDocument}
      />
      {a.documents.map((row, i) => (
        <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Label (e.g. Permission slip)"
            value={row.label}
            onChange={(e) => a.setDocumentLabel(i, e.target.value)}
            className={`min-w-[140px] flex-1 ${inputBase} py-1.5 text-sm`}
          />
          {row.existingUrl && !row.file && (
            <a
              href={row.existingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View current file
            </a>
          )}
          <input
            type="file"
            accept={DOC_ACCEPT}
            onChange={(e) => a.setDocumentFile(i, e.target.files?.[0] ?? null)}
            className={`min-w-[160px] flex-1 ${inputBase} ${inputFile} py-1.5`}
            title={row.existingUrl ? 'Choose a file to replace the current attachment' : undefined}
          />
          {row.file && <span className="text-xs text-slate-500 dark:text-slate-400">New: {row.file.name}</span>}
          <button type="button" onClick={() => a.removeDocument(i)} className={REMOVE} aria-label="Remove document">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function LinksField({ a }: { a: PostAttachments }) {
  return (
    <div className="mb-4">
      <SectionHeader label="Optional links (edit label or URL; remove a row to delete)" action="Add link" onAction={a.addLink} />
      {a.links.map((link, i) => (
        <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Label (e.g. School calendar)"
            value={link.label}
            onChange={(e) => a.setLinkLabel(i, e.target.value)}
            className={`min-w-[120px] flex-1 ${inputBase} py-1.5 text-sm`}
          />
          <input
            type="url"
            placeholder="https://..."
            value={link.url}
            onChange={(e) => a.setLinkUrl(i, e.target.value)}
            className={`min-w-[180px] flex-1 ${inputBase} py-1.5 text-sm`}
          />
          <button type="button" onClick={() => a.removeLink(i)} className={REMOVE} aria-label="Remove link">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function AudienceField({ a, classes, radioName }: { a: PostAttachments; classes: { id: string; name: string }[]; radioName: string }) {
  const option = (value: 'everyone' | 'classes', label: string) => (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="radio" name={radioName} checked={a.targetType === value} onChange={() => a.setTargetType(value)} className="text-primary-600" />
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Target audience</label>
      <div className="flex flex-col gap-2">
        {option('everyone', 'Everyone')}
        {option('classes', 'Specific classes')}
        {a.targetType === 'classes' && classes.length > 0 && (
          <div className="ml-6 mt-1 flex flex-wrap gap-3">
            {classes.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.targetClassIds.includes(c.id)}
                  onChange={() => a.toggleTargetClass(c.id)}
                  className="rounded border-slate-300 text-primary-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Props = { attachments: PostAttachments; classes: { id: string; name: string }[]; radioName: string };

export function AttachmentFields({ attachments: a, classes, radioName }: Props) {
  return (
    <>
      <MediaUploadSection
        imageFile={a.imageFile}
        setImageFile={a.setImageFile}
        videoFile={a.videoFile}
        setVideoFile={a.setVideoFile}
        existingUrl={a.existingImageUrl}
        existingMediaType={a.existingMediaType}
        inputBase={inputBase}
        inputFile={inputFile}
      />
      <DocumentsField a={a} />
      <LinksField a={a} />
      <AudienceField a={a} classes={classes} radioName={radioName} />
    </>
  );
}

type ActionsProps = { submitting: boolean; disabled: boolean; label: string; busyLabel: string; onCancel: () => void };

export function PostFormActions({ submitting, disabled, label, busyLabel, onCancel }: ActionsProps) {
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={submitting || disabled} className="btn-primary">
        {submitting ? busyLabel : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Cancel
      </button>
    </div>
  );
}
