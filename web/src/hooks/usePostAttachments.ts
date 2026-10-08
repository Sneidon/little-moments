import { useCallback, useState } from 'react';
import type { EventDocumentLink } from 'shared/types';

export type PendingDocument = { label: string; file: File | null; existingUrl?: string };
export type PendingLink = { label: string; url: string };
export type TargetType = 'everyone' | 'classes';

type PostWithAttachments = {
  imageUrl?: string;
  mediaType?: string;
  documents?: EventDocumentLink[];
  links?: EventDocumentLink[];
  targetType?: TargetType;
  targetClassIds?: string[];
};

const updateAt = <T,>(rows: T[], i: number, change: (row: T) => T) => rows.map((row, idx) => (idx === i ? change(row) : row));
const labelOf = (d: EventDocumentLink) => (d.label || d.name || '').trim();

export function usePostAttachments() {
  const [imageFile, setImageFileState] = useState<File | null>(null);
  const [videoFile, setVideoFileState] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingMediaType, setExistingMediaType] = useState<string | undefined>(undefined);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [links, setLinks] = useState<PendingLink[]>([]);
  const [targetType, setTargetType] = useState<TargetType>('everyone');
  const [targetClassIds, setTargetClassIds] = useState<string[]>([]);

  const clearExistingMedia = () => {
    setExistingImageUrl(null);
    setExistingMediaType(undefined);
  };

  // Image and video are mutually exclusive; picking one replaces the other and any stored media.
  const setImageFile = useCallback((f: File | null) => {
    setImageFileState(f);
    if (f) {
      setVideoFileState(null);
      clearExistingMedia();
    }
  }, []);

  const setVideoFile = useCallback((f: File | null) => {
    setVideoFileState(f);
    if (f) {
      setImageFileState(null);
      clearExistingMedia();
    }
  }, []);

  const load = useCallback((post: PostWithAttachments | null) => {
    setImageFileState(null);
    setVideoFileState(null);
    setExistingImageUrl(post?.imageUrl ?? null);
    setExistingMediaType(post?.mediaType);
    setDocuments((post?.documents ?? []).map((d) => ({ label: labelOf(d), file: null, existingUrl: d.url })));
    setLinks((post?.links ?? []).map((d) => ({ label: labelOf(d), url: d.url || '' })));
    setTargetType(post?.targetType || 'everyone');
    setTargetClassIds(post?.targetClassIds || []);
  }, []);

  return {
    imageFile,
    setImageFile,
    videoFile,
    setVideoFile,
    existingImageUrl,
    existingMediaType,
    documents,
    addDocument: useCallback(() => setDocuments((d) => [...d, { label: '', file: null }]), []),
    removeDocument: useCallback((i: number) => setDocuments((d) => d.filter((_, idx) => idx !== i)), []),
    setDocumentLabel: useCallback((i: number, label: string) => setDocuments((d) => updateAt(d, i, (row) => ({ ...row, label }))), []),
    setDocumentFile: useCallback(
      (i: number, file: File | null) =>
        setDocuments((d) => updateAt(d, i, (row) => (file ? { ...row, file, existingUrl: undefined } : { ...row, file: null }))),
      []
    ),
    links,
    addLink: useCallback(() => setLinks((l) => [...l, { label: '', url: '' }]), []),
    removeLink: useCallback((i: number) => setLinks((l) => l.filter((_, idx) => idx !== i)), []),
    setLinkLabel: useCallback((i: number, label: string) => setLinks((l) => updateAt(l, i, (row) => ({ ...row, label }))), []),
    setLinkUrl: useCallback((i: number, url: string) => setLinks((l) => updateAt(l, i, (row) => ({ ...row, url }))), []),
    targetType,
    setTargetType,
    targetClassIds,
    setTargetClassIds,
    toggleTargetClass: useCallback(
      (classId: string) => setTargetClassIds((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId])),
      []
    ),
    load,
  };
}

export type PostAttachments = ReturnType<typeof usePostAttachments>;
