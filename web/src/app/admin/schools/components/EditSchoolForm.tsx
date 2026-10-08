import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SectionCard } from '@/components/ui';
import type { School, SubscriptionStatus } from 'shared/types';
import { callableMessage, Field, INPUT } from './fields';

type Props = { school: School; onSaved: (updates: Partial<School>) => void; onCancel: () => void };

export function EditSchoolForm({ school, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: school.name ?? '',
    address: school.address ?? '',
    contactEmail: school.contactEmail ?? '',
    contactPhone: school.contactPhone ?? '',
    description: school.description ?? '',
    website: school.website ?? '',
    subscriptionStatus: (school.subscriptionStatus ?? 'active') as SubscriptionStatus,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const optional = (v: string) => v.trim() || undefined;
      const updates = {
        name: form.name.trim(),
        address: optional(form.address),
        contactEmail: optional(form.contactEmail),
        contactPhone: optional(form.contactPhone),
        description: optional(form.description),
        website: optional(form.website),
        subscriptionStatus: form.subscriptionStatus,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'schools', school.id), updates);
      onSaved(updates);
    } catch (err) {
      setError(callableMessage(err, 'Failed to save'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard topBar="primary" className="mb-8">
      <form onSubmit={save}>
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Edit school</h2>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={set('name')} placeholder="e.g. St. John's School" required />
          <Field label="Address" value={form.address} onChange={set('address')} placeholder="123 Main St, Anytown, USA" />
          <Field label="Contact email" type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="info@stjohnsschool.com" />
          <Field label="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} placeholder="123-456-7890" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              rows={2}
              placeholder="Short description of the school"
              className={INPUT}
            />
          </div>
          <Field label="Website" type="url" value={form.website} onChange={set('website')} placeholder="https://..." />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Subscription</label>
            <select value={form.subscriptionStatus} onChange={(e) => set('subscriptionStatus')(e.target.value)} className={`${INPUT} max-w-xs`}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
