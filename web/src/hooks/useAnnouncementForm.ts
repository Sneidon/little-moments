'use client';

import { useState, useCallback } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadAnnouncementImage, uploadAnnouncementDocument } from '@/utils/uploadImage';
import type { Announcement, EventDocumentLink } from 'shared/types';

export interface PendingDocument {
  label: string;
  file: File | null;
}

export interface PendingLink {
  label: string;
  url: string;
}

export interface UseAnnouncementFormOptions {
  schoolId: string | undefined;
  createdBy: string;
  onSuccess?: () => void;
}

export interface UseAnnouncementFormResult {
  title: string;
  setTitle: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  documents: PendingDocument[];
  addDocument: () => void;
  removeDocument: (i: number) => void;
  setDocumentLabel: (i: number, label: string) => void;
  setDocumentFile: (i: number, file: File | null) => void;
  links: PendingLink[];
  addLink: () => void;
  removeLink: (i: number) => void;
  setLinkLabel: (i: number, label: string) => void;
  setLinkUrl: (i: number, url: string) => void;
  targetType: 'everyone' | 'classes';
  setTargetType: (v: 'everyone' | 'classes') => void;
  targetClassIds: string[];
  setTargetClassIds: (ids: string[]) => void;
  toggleTargetClass: (classId: string) => void;
  submitting: boolean;
  submit: (e: React.FormEvent) => Promise<void>;
  canSubmit: boolean;
}

export function useAnnouncementForm({
  schoolId,
  createdBy,
  onSuccess,
}: UseAnnouncementFormOptions): UseAnnouncementFormResult {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [links, setLinks] = useState<PendingLink[]>([]);
  const [targetType, setTargetType] = useState<'everyone' | 'classes'>('everyone');
  const [targetClassIds, setTargetClassIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTargetClass = useCallback((classId: string) => {
    setTargetClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  }, []);

  const addDocument = useCallback(() => {
    setDocuments((d) => [...d, { label: '', file: null }]);
  }, []);

  const removeDocument = useCallback((i: number) => {
    setDocuments((d) => d.filter((_, idx) => idx !== i));
  }, []);

  const setDocumentLabel = useCallback((i: number, label: string) => {
    setDocuments((d) => d.map((row, idx) => (idx === i ? { ...row, label } : row)));
  }, []);

  const setDocumentFile = useCallback((i: number, file: File | null) => {
    setDocuments((d) => d.map((row, idx) => (idx === i ? { ...row, file } : row)));
  }, []);

  const addLink = useCallback(() => {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  }, []);

  const removeLink = useCallback((i: number) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const setLinkLabel = useCallback((i: number, label: string) => {
    setLinks((prev) => prev.map((row, idx) => (idx === i ? { ...row, label } : row)));
  }, []);

  const setLinkUrl = useCallback((i: number, url: string) => {
    setLinks((prev) => prev.map((row, idx) => (idx === i ? { ...row, url } : row)));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!schoolId || !title.trim()) return;
      setSubmitting(true);
      try {
        const announcementData: Record<string, unknown> = {
          schoolId,
          title: title.trim(),
          createdBy,
          createdAt: new Date().toISOString(),
        };
        if (body.trim()) announcementData.body = body.trim();
        announcementData.targetType = targetType;
        if (targetType === 'classes' && targetClassIds.length > 0) {
          announcementData.targetClassIds = targetClassIds;
        }

        const ref = await addDoc(
          collection(db, 'schools', schoolId, 'announcements'),
          announcementData
        );

        const updates: Partial<Announcement> = {};

        if (imageFile) {
          updates.imageUrl = await uploadAnnouncementImage(imageFile, schoolId, ref.id);
        }

        const docsWithFiles = documents.filter((d) => d.file);
        if (docsWithFiles.length > 0) {
          const uploadedDocs: EventDocumentLink[] = await Promise.all(
            docsWithFiles.map(async (d, idx) => {
              const url = await uploadAnnouncementDocument(
                d.file!,
                schoolId,
                ref.id,
                `doc-${idx}-${Date.now()}`
              );
              return {
                label: d.label?.trim() || undefined,
                name: d.label?.trim() || undefined,
                url,
              };
            })
          );
          updates.documents = uploadedDocs;
        }

        const validLinks = links.filter((l) => l.url?.trim());
        if (validLinks.length > 0) {
          updates.links = validLinks.map((l) => ({
            label: l.label?.trim() || undefined,
            name: l.label?.trim() || undefined,
            url: l.url.trim(),
          }));
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'schools', schoolId, 'announcements', ref.id), updates);
        }

        setTitle('');
        setBody('');
        setImageFile(null);
        setDocuments([]);
        setLinks([]);
        setTargetType('everyone');
        setTargetClassIds([]);
        onSuccess?.();
      } finally {
        setSubmitting(false);
      }
    },
    [schoolId, title, body, imageFile, documents, links, targetType, targetClassIds, createdBy, onSuccess]
  );

  return {
    title,
    setTitle,
    body,
    setBody,
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
    setTargetClassIds,
    toggleTargetClass,
    submitting,
    submit,
    canSubmit: !!title.trim(),
  };
}
