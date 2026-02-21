'use client';

import { useState, useCallback } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadEventImage, uploadEventDocument } from '@/utils/uploadImage';
import type { Event, EventDocumentLink } from 'shared/types';

export interface PendingDocument {
  label: string;
  file: File | null;
}

export interface PendingLink {
  label: string;
  url: string;
}

export interface UseEventFormOptions {
  schoolId: string | undefined;
  createdBy: string;
  onSuccess?: () => void;
}

export interface UseEventFormResult {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startAt: string;
  setStartAt: (v: string) => void;
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
  submitting: boolean;
  submit: (e: React.FormEvent) => Promise<void>;
  canSubmit: boolean;
}

export function useEventForm({
  schoolId,
  createdBy,
  onSuccess,
}: UseEventFormOptions): UseEventFormResult {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [links, setLinks] = useState<PendingLink[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      if (!schoolId || !title.trim() || !startAt) return;
      setSubmitting(true);
      try {
        const eventData: Record<string, unknown> = {
          schoolId,
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          createdBy,
          createdAt: new Date().toISOString(),
        };
        if (description.trim()) eventData.description = description.trim();

        const ref = await addDoc(
          collection(db, 'schools', schoolId, 'events'),
          eventData
        );

        const updates: Partial<Event> = {};

        if (imageFile) {
          updates.imageUrl = await uploadEventImage(imageFile, schoolId, ref.id);
        }

        const docsWithFiles = documents.filter((d) => d.file);
        if (docsWithFiles.length > 0) {
          const uploadedDocs: EventDocumentLink[] = await Promise.all(
            docsWithFiles.map(async (d, idx) => {
              const url = await uploadEventDocument(
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
          await updateDoc(doc(db, 'schools', schoolId, 'events', ref.id), updates);
        }

        setTitle('');
        setDescription('');
        setStartAt('');
        setImageFile(null);
        setDocuments([]);
        setLinks([]);
        onSuccess?.();
      } finally {
        setSubmitting(false);
      }
    },
    [schoolId, title, description, startAt, imageFile, documents, links, createdBy, onSuccess]
  );

  return {
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
    submitting,
    submit,
    canSubmit: !!title.trim() && !!startAt,
  };
}
