'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import type { School, SubscriptionStatus } from 'shared/types';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
    website: '',
    subscriptionStatus: 'active' as SubscriptionStatus,
    principalEmail: '',
    principalDisplayName: '',
    principalPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const snap = await getDocs(collection(db, 'schools'));
    setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() } as School)));
  };

  useEffect(() => {
    load().then(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const data = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        ...(editingId ? { subscriptionStatus: form.subscriptionStatus } : {}),
        updatedAt: now,
      };
      if (editingId) {
        await updateDoc(doc(db, 'schools', editingId), data);
        setSchools((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...data } : s)));
        setEditingId(null);
        setForm({ name: '', address: '', contactEmail: '', contactPhone: '', description: '', website: '', subscriptionStatus: 'active', principalEmail: '', principalDisplayName: '', principalPassword: '' });
        setShowForm(false);
      } else {
        if (!form.principalEmail?.trim() || !form.principalPassword) {
          setError('Principal email and password (min 6 characters) are required.');
          return;
        }
        const functions = getFunctions(app);
        const createSchool = httpsCallable<{
          name: string;
          address?: string;
          contactEmail?: string;
          contactPhone?: string;
          description?: string;
          website?: string;
          principalEmail: string;
          principalDisplayName?: string;
          principalPassword: string;
        }, { schoolId: string; principalUid: string }>(functions, 'createSchoolWithPrincipal');
        const res = await createSchool({
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          description: form.description.trim() || undefined,
          website: form.website.trim() || undefined,
          principalEmail: form.principalEmail.trim(),
          principalDisplayName: form.principalDisplayName.trim() || undefined,
          principalPassword: form.principalPassword,
        });
        const { schoolId } = res.data;
        setSchools((prev) => [...prev, { id: schoolId, ...data, subscriptionStatus: 'active' as const, createdAt: now } as School]);
        setForm({ name: '', address: '', contactEmail: '', contactPhone: '', description: '', website: '', subscriptionStatus: 'active', principalEmail: '', principalDisplayName: '', principalPassword: '' });
        setShowForm(false);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to save';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s: School) => {
    setEditingId(s.id);
    setError('');
    setForm({
      name: s.name ?? '',
      address: s.address ?? '',
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      description: s.description ?? '',
      website: s.website ?? '',
      subscriptionStatus: s.subscriptionStatus ?? 'active',
      principalEmail: '',
      principalDisplayName: '',
      principalPassword: '',
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Schools</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setError('');
            setForm({ name: '', address: '', contactEmail: '', contactPhone: '', description: '', website: '', subscriptionStatus: 'active', principalEmail: '', principalDisplayName: '', principalPassword: '' });
          }}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add school
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit school' : 'New school'}
          </h2>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Short description of the school"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            {editingId && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Subscription</label>
                <select
                  value={form.subscriptionStatus}
                  onChange={(e) => setForm((f) => ({ ...f, subscriptionStatus: e.target.value as SubscriptionStatus }))}
                  className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
            {!editingId && (
              <>
                <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Principal (direct add)</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Principal email</label>
                  <input
                    type="email"
                    value={form.principalEmail}
                    onChange={(e) => setForm((f) => ({ ...f, principalEmail: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="principal@school.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Principal display name</label>
                  <input
                    type="text"
                    value={form.principalDisplayName}
                    onChange={(e) => setForm((f) => ({ ...f, principalDisplayName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Principal password</label>
                  <input
                    type="password"
                    value={form.principalPassword}
                    onChange={(e) => setForm((f) => ({ ...f, principalPassword: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Min 6 characters"
                    minLength={6}
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add school'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Subscription</th>
                <th className="px-4 py-3 font-medium text-slate-700">Address</th>
                <th className="px-4 py-3 font-medium text-slate-700">Contact</th>
                <th className="px-4 py-3 font-medium text-slate-700">Website</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        (s.subscriptionStatus ?? 'active') === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.subscriptionStatus ?? 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={s.address}>{s.address ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span title={[s.contactEmail, s.contactPhone].filter(Boolean).join(' · ')}>
                      {s.contactEmail ?? s.contactPhone ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate max-w-[120px] block">
                        {s.website}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="text-slate-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {schools.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No schools yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
