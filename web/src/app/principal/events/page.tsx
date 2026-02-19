'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Event } from 'shared/types';

export default function EventsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<Event[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !title.trim() || !startAt) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'schools', schoolId, 'events'), {
        schoolId,
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setDescription('');
      setStartAt('');
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date().toISOString();
  const upcoming = list.filter((e) => e.startAt >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = list.filter((e) => e.startAt < now);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Events</h1>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="text"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim() || !startAt}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </form>

      <h2 className="mb-3 font-semibold text-slate-800">Upcoming events</h2>
      <div className="mb-8 space-y-4">
        {upcoming.map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="font-semibold text-slate-800">{ev.title}</h3>
            {ev.description && <p className="mt-1 text-slate-600">{ev.description}</p>}
            <p className="mt-2 text-sm text-slate-500">
              {new Date(ev.startAt).toLocaleString()}
            </p>
          </div>
        ))}
        {upcoming.length === 0 && <p className="text-slate-500">No upcoming events.</p>}
      </div>

      <h2 className="mb-3 font-semibold text-slate-800">Past events</h2>
      <div className="space-y-4">
        {past.slice(0, 20).map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <h3 className="font-medium text-slate-700">{ev.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {new Date(ev.startAt).toLocaleString()}
            </p>
          </div>
        ))}
        {past.length === 0 && <p className="text-slate-500">No past events.</p>}
      </div>
    </div>
  );
}
