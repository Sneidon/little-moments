'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { School } from 'shared/types';
import { PageHero, SectionCard, CardSkeleton } from '@/components/ui';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      const snap = await getDoc(doc(db, 'schools', schoolId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as School;
        setSchool(data);
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          contactEmail: data.contactEmail ?? '',
          contactPhone: data.contactPhone ?? '',
        });
      }
      setLoading(false);
    })();
  }, [profile?.schoolId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    setSubmitting(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'schools', schoolId), {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      setSchool((prev) => (prev ? { ...prev, ...form } : null));
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHero variant="full" title={<span className="text-gradient-warm">School settings</span>} subtitle="Update your school details" />
        <SectionCard topBar="accent" padding="default">
          <CardSkeleton />
        </SectionCard>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="animate-fade-in">
        <PageHero variant="compact" title="School settings" subtitle="School not found." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">School settings</span>}
        subtitle="Update your school details"
      />
      <form onSubmit={save} className="card max-w-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">School name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Optional"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              placeholder="Optional"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact phone</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              placeholder="Optional"
              className="input-base"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400" role="status">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
