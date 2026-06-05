'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/config/firebase';
import type { School, SubscriptionStatus } from 'shared/types';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
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
  const [inviteForm, setInviteForm] = useState({
    schoolName: '',
    principalName: '',
    principalEmail: '',
    logoUrl: '',
  });
  const [inviteResult, setInviteResult] = useState<{ token: string; expiresAt: string; schoolName: string } | null>(null);
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

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteResult(null);
    if (!inviteForm.schoolName.trim() || !inviteForm.principalEmail.trim()) {
      setError('School name and principal email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const functions = getFunctions(app);
      const fn = httpsCallable<
        { schoolName: string; principalName?: string; principalEmail: string; logoUrl?: string },
        { token: string; expiresAt: string; schoolName: string }
      >(functions, 'adminInvitePrincipal');
      const res = await fn({
        schoolName: inviteForm.schoolName.trim(),
        principalName: inviteForm.principalName.trim() || undefined,
        principalEmail: inviteForm.principalEmail.trim(),
        logoUrl: inviteForm.logoUrl.trim() || undefined,
      });
      setInviteResult({ token: res.data.token, expiresAt: res.data.expiresAt, schoolName: res.data.schoolName });
      setInviteForm({ schoolName: '', principalName: '', principalEmail: '', logoUrl: '' });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err && typeof err === 'object' && 'details' in err
            ? String((err as { details: unknown }).details)
            : 'Failed to send invite';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Schools</span>}
        subtitle="Create and manage schools"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setShowInviteForm(false);
                setEditingId(null);
                setInviteResult(null);
                setError('');
                setForm({ name: '', address: '', contactEmail: '', contactPhone: '', description: '', website: '', subscriptionStatus: 'active', principalEmail: '', principalDisplayName: '', principalPassword: '' });
              }}
              className="btn-secondary hidden"
              aria-hidden
            >
              Add school
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(true);
                setShowForm(false);
                setEditingId(null);
                setInviteResult(null);
                setError('');
                setInviteForm({ schoolName: '', principalName: '', principalEmail: '', logoUrl: '' });
              }}
              className="btn-primary"
            >
              Invite school
            </button>
          </div>
        }
      />

      {showInviteForm && (
        <SectionCard topBar="accent" className="mb-8">
          <form onSubmit={sendInvite}>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">Invite principal</h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Sends an email link to the principal. They set their password on first open.
            </p>
            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {inviteResult && (
              <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
                <p className="font-semibold">Invite sent.</p>
                <p className="mt-1">School: <span className="font-mono">{inviteResult.schoolName}</span></p>
                <p className="mt-1">
                  Expires at: <span className="font-mono">{inviteResult.expiresAt}</span>
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">School name</label>
                <input
                  type="text"
                  value={inviteForm.schoolName}
                  onChange={(e) => setInviteForm((f) => ({ ...f, schoolName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  required
                  placeholder="e.g. St. John's School"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Principal name</label>
                <input
                  type="text"
                  value={inviteForm.principalName}
                  onChange={(e) => setInviteForm((f) => ({ ...f, principalName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Principal email</label>
                <input
                  type="email"
                  value={inviteForm.principalEmail}
                  onChange={(e) => setInviteForm((f) => ({ ...f, principalEmail: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="principal@school.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Logo URL (optional)</label>
                <input
                  type="url"
                  value={inviteForm.logoUrl}
                  onChange={(e) => setInviteForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteResult(null);
                  setError('');
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {showForm && (
        <SectionCard topBar="primary" className="mb-8">
          <form onSubmit={save}>
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? 'Edit school' : 'New school'}
          </h2>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                required
                placeholder="e.g. St. John's School"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="123 Main St, Anytown, USA"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="info@stjohnsschool.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="123-456-7890"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Short description of the school"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            {editingId && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Subscription</label>
                <select
                  value={form.subscriptionStatus}
                  onChange={(e) => setForm((f) => ({ ...f, subscriptionStatus: e.target.value as SubscriptionStatus }))}
                  className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
            {!editingId && (
              <>
                <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Principal (direct add)</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Principal email</label>
                  <input
                    type="email"
                    value={form.principalEmail}
                    onChange={(e) => setForm((f) => ({ ...f, principalEmail: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="principal@school.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Principal display name</label>
                  <input
                    type="text"
                    value={form.principalDisplayName}
                    onChange={(e) => setForm((f) => ({ ...f, principalDisplayName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Principal password</label>
                  <input
                    type="password"
                    value={form.principalPassword}
                    onChange={(e) => setForm((f) => ({ ...f, principalPassword: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
              className="btn-primary"
            >
              {submitting ? 'Saving…' : editingId ? 'Save' : 'Add school'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton rows={6} cols={6} />
        </SectionCard>
      ) : (
        <SectionCard topBar="accent" padding="none">
          <div className="overflow-hidden">
          <table className="data-table">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Onboarding</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Subscription</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Address</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Contact</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Website</th>
                <th className="w-0 px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/admin/schools/${s.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {(s.status ?? '—') as string}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        (s.subscriptionStatus ?? 'active') === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {s.subscriptionStatus ?? 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate" title={s.address}>{s.address ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span title={[s.contactEmail, s.contactPhone].filter(Boolean).join(' · ')}>
                      {s.contactEmail ?? s.contactPhone ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[120px] block">
                        {s.website}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {schools.length === 0 && (
            <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>
          )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
