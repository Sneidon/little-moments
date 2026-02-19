'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Announcement } from 'shared/types';

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId || !title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'schools', schoolId, 'announcements'), {
        schoolId,
        title: title.trim(),
        body: body.trim(),
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setBody('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Announcements</h1>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post announcement'}
        </button>
      </form>
      <div className="space-y-4">
        {list.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold text-slate-800">{a.title}</h2>
            <p className="mt-1 text-slate-600 whitespace-pre-wrap">{a.body}</p>
            <p className="mt-2 text-xs text-slate-400">
              {new Date(a.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="text-slate-500">No announcements yet.</p>}
    </div>
  );
}
