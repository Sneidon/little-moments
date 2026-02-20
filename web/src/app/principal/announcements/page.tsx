'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadAnnouncementImage, uploadAnnouncementDocument } from '@/utils/uploadImage';
import type { Announcement, EventDocumentLink } from 'shared/types';

type PendingDocument = { label: string; file: File | null };

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const addDocument = () => setDocuments((d) => [...d, { label: '', file: null }]);
  const removeDocument = (i: number) => setDocuments((d) => d.filter((_, idx) => idx !== i));
  const setDocumentLabel = (i: number, label: string) =>
    setDocuments((d) => d.map((docRow, idx) => (idx === i ? { ...docRow, label } : docRow)));
  const setDocumentFile = (i: number, file: File | null) =>
    setDocuments((d) => d.map((docRow, idx) => (idx === i ? { ...docRow, file } : docRow)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !title.trim()) return;
    setSubmitting(true);
    try {
      const announcementData: Record<string, unknown> = {
        schoolId,
        title: title.trim(),
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
      };
      if (body.trim()) announcementData.body = body.trim();
      const ref = await addDoc(collection(db, 'schools', schoolId, 'announcements'), announcementData);
      const updates: Partial<Announcement> = {};
      if (imageFile) {
        updates.imageUrl = await uploadAnnouncementImage(imageFile, schoolId, ref.id);
      }
      const docsWithFiles = documents.filter((d) => d.file);
      if (docsWithFiles.length > 0) {
        const uploadedDocs: EventDocumentLink[] = await Promise.all(
          docsWithFiles.map(async (d, idx) => {
            const url = await uploadAnnouncementDocument(d.file!, schoolId, ref.id, `doc-${idx}-${Date.now()}`);
            return { label: d.label?.trim() || undefined, name: d.label?.trim() || undefined, url };
          })
        );
        updates.documents = uploadedDocs;
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'schools', schoolId, 'announcements', ref.id), updates);
      }
      setTitle('');
      setBody('');
      setImageFile(null);
      setDocuments([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Post updates for parents and staff</p>
      </div>
      <form onSubmit={submit} className="card mb-8 p-6">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">New announcement</label>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base mb-3"
        />
        <textarea
          placeholder="Body (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="input-base mb-4 resize-y"
        />
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Optional image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="input-base text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1 file:text-primary-700"
          />
        </div>
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Optional documents (upload files; add a label for each)</span>
            <button type="button" onClick={addDocument} className="text-sm text-primary-600 hover:underline">Add document</button>
          </div>
          {documents.map((docRow, i) => (
            <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Label (e.g. Permission slip)"
                value={docRow.label}
                onChange={(e) => setDocumentLabel(i, e.target.value)}
                className="min-w-[140px] flex-1 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm"
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setDocumentFile(i, e.target.files?.[0] ?? null)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-primary-100 file:px-2 file:py-0.5 file:text-sm file:text-primary-700"
              />
              {docRow.file && <span className="text-xs text-slate-500 dark:text-slate-400">{docRow.file.name}</span>}
              <button type="button" onClick={() => removeDocument(i)} className="rounded px-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Remove">×</button>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="btn-primary"
        >
          {submitting ? 'Posting…' : 'Post announcement'}
        </button>
      </form>
      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Recent announcements</h2>
      <div className="space-y-4">
        {list.map((a) => (
          <article
            key={a.id}
            className="card p-5"
          >
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
            {a.body ? (
              <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{a.body}</p>
            ) : null}
            {a.imageUrl && (
              <img src={a.imageUrl} alt="" className="mt-2 max-h-48 w-full rounded-lg object-cover" />
            )}
            {a.documents && a.documents.length > 0 && (
              <ul className="mt-2 space-y-1">
                {a.documents.map((d, i) => (
                  <li key={i}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{d.label || d.name || d.url}</a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {new Date(a.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
      {list.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No announcements yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Post one above to get started.</p>
        </div>
      )}
    </div>
  );
}
