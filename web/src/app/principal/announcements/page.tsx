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
