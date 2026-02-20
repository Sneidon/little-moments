'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadEventImage, uploadEventDocument } from '@/utils/uploadImage';
import type { Event, EventDocumentLink } from 'shared/types';

type PendingDocument = { label: string; file: File | null };

export default function EventsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<Event[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'events'),
      orderBy('startAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const addDocument = () => setDocuments((d) => [...d, { label: '', file: null }]);
  const removeDocument = (i: number) => setDocuments((d) => d.filter((_, idx) => idx !== i));
  const setDocumentLabel = (i: number, label: string) =>
    setDocuments((d) => d.map((doc, idx) => (idx === i ? { ...doc, label } : doc)));
  const setDocumentFile = (i: number, file: File | null) =>
    setDocuments((d) => d.map((doc, idx) => (idx === i ? { ...doc, file } : doc)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !title.trim() || !startAt) return;
    setSubmitting(true);
    try {
      const eventData: Record<string, unknown> = {
        schoolId,
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
      };
      const desc = description.trim();
      if (desc) eventData.description = desc;
      const ref = await addDoc(collection(db, 'schools', schoolId, 'events'), eventData);
      const updates: Partial<Event> = {};
      if (imageFile) {
        updates.imageUrl = await uploadEventImage(imageFile, schoolId, ref.id);
      }
      const docsWithFiles = documents.filter((d) => d.file);
      if (docsWithFiles.length > 0) {
        const uploadedDocs: EventDocumentLink[] = await Promise.all(
          docsWithFiles.map(async (d, idx) => {
            const url = await uploadEventDocument(d.file!, schoolId, ref.id, `doc-${idx}-${Date.now()}`);
            return { label: d.label?.trim() || undefined, name: d.label?.trim() || undefined, url };
          })
        );
        updates.documents = uploadedDocs;
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'schools', schoolId, 'events', ref.id), updates);
      }
      setTitle('');
      setDescription('');
      setStartAt('');
      setImageFile(null);
      setDocuments([]);
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date().toISOString();
  const upcoming = list.filter((e) => e.startAt >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = list.filter((e) => e.startAt < now);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">Events</h1>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm"
      >
        <input
          type="text"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <div className="mb-3">
          <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Optional image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1 file:text-primary-700"
          />
        </div>
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Optional documents (upload files; add a label for each)</span>
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
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim() || !startAt}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </form>

      <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-200">Upcoming events</h2>
      <div className="mb-8 space-y-4">
        {upcoming.map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm"
          >
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{ev.title}</h3>
            {ev.description && <p className="mt-1 text-slate-600 dark:text-slate-300">{ev.description}</p>}
            {ev.imageUrl && (
              <img src={ev.imageUrl} alt="" className="mt-2 max-h-48 w-full rounded-lg object-cover" />
            )}
            {ev.documents && ev.documents.length > 0 && (
              <ul className="mt-2 space-y-1">
                {ev.documents.map((d, i) => (
                  <li key={i}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{d.label || d.name || d.url}</a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {new Date(ev.startAt).toLocaleString()}
            </p>
          </div>
        ))}
        {upcoming.length === 0 && <p className="text-slate-500 dark:text-slate-400">No upcoming events.</p>}
      </div>

      <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-200">Past events</h2>
      <div className="space-y-4">
        {past.slice(0, 20).map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4"
          >
            <h3 className="font-medium text-slate-700 dark:text-slate-200">{ev.title}</h3>
            {ev.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ev.description}</p>}
            {ev.imageUrl && (
              <img src={ev.imageUrl} alt="" className="mt-2 max-h-32 w-full rounded-lg object-cover" />
            )}
            {ev.documents && ev.documents.length > 0 && (
              <ul className="mt-2 space-y-1">
                {ev.documents.map((d, i) => (
                  <li key={i}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">{d.label || d.name || d.url}</a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {new Date(ev.startAt).toLocaleString()}
            </p>
          </div>
        ))}
        {past.length === 0 && <p className="text-slate-500 dark:text-slate-400">No past events.</p>}
      </div>
    </div>
  );
}
