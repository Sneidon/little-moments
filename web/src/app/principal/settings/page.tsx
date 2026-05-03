'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/config/firebase';
import { app } from '@/config/firebase';
import type { School, QRCode } from 'shared/types';
import { PageHero, SchoolSettingsSkeleton } from '@/components/ui';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [activeQr, setActiveQr] = useState<QRCode | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrForm, setQrForm] = useState({ expiresAt: '', maxRegistrations: '' });
  const [qrMode, setQrMode] = useState<'WEB_FORM' | 'WHATSAPP_DEEP_LINK'>('WEB_FORM');
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<{ createdCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadActiveQr = async (schoolId: string) => {
    const snap = await getDocs(
      query(
        collection(db, 'schools', schoolId, 'qrCodes'),
        where('isActive', '==', true),
        where('classId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
    );
    if (snap.empty) {
      setActiveQr(null);
      return;
    }
    const d = snap.docs[0].data() as QRCode;
    setActiveQr({ ...d, id: snap.docs[0].id });
  };

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
      await loadActiveQr(schoolId);
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
        <SchoolSettingsSkeleton />
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

  const generateQr = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    setQrError('');
    setQrLoading(true);
    try {
      const fn = httpsCallable<
        { schoolId: string; classId?: string | null; expiresAt?: string | null; maxRegistrations?: number | null; source?: 'POSTER'; mode?: 'WEB_FORM' | 'WHATSAPP_DEEP_LINK' },
        { ok: true }
      >(getFunctions(app), 'createOrUpdateQrCode');
      const expiresAt = qrForm.expiresAt.trim() || null;
      const maxRegistrations = qrForm.maxRegistrations.trim()
        ? Math.max(0, parseInt(qrForm.maxRegistrations.trim(), 10))
        : null;
      await fn({ schoolId, classId: null, expiresAt, maxRegistrations, source: 'POSTER', mode: qrMode });
      await loadActiveQr(schoolId);
    } catch (err: unknown) {
      setQrError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to generate QR');
    } finally {
      setQrLoading(false);
    }
  };

  const rotateQr = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !activeQr?.id) return;
    setQrError('');
    setQrLoading(true);
    try {
      const fn = httpsCallable<{ schoolId: string; qrCodeId: string }, { ok: true }>(getFunctions(app), 'regenerateQrCode');
      await fn({ schoolId, qrCodeId: activeQr.id });
      await loadActiveQr(schoolId);
    } catch (err: unknown) {
      setQrError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to regenerate QR');
    } finally {
      setQrLoading(false);
    }
  };

  const generatePersonalised = async () => {
    setQrError('');
    setCsvResult(null);
    setQrLoading(true);
    try {
      const fn = httpsCallable<{ csvText: string }, { ok: true; createdCount: number }>(getFunctions(app), 'generatePersonalisedQrsFromCsv');
      const res = await fn({ csvText });
      setCsvResult({ createdCount: res.data.createdCount });
    } catch (err: unknown) {
      setQrError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to generate personalised QRs');
    } finally {
      setQrLoading(false);
    }
  };

  const joinUrl = activeQr?.inviteUrl && activeQr.mode === 'WHATSAPP_DEEP_LINK' ? activeQr.inviteUrl : (activeQr as any)?.joinUrl || activeQr?.inviteUrl;
  const waShareUrl = joinUrl
    ? `https://wa.me/?text=${encodeURIComponent(`New parent? Register here: ${joinUrl}`)}`
    : null;

  return (
    <div className="animate-fade-in">
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">School settings</span>}
        subtitle="Update your school details"
      />
      <div className="grid gap-6 lg:grid-cols-2">
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
          <button
            type="button"
            onClick={() =>
              setForm({
                name: school.name ?? '',
                address: school.address ?? '',
                contactEmail: school.contactEmail ?? '',
                contactPhone: school.contactPhone ?? '',
              })
            }
            className="btn-secondary"
          >
            Cancel
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400" role="status">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
              Saved
            </span>
          )}
        </div>
      </form>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Invite parents (QR code)</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Generate a school QR code parents can scan to register.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Expiry (optional, ISO)</label>
            <input
              type="text"
              value={qrForm.expiresAt}
              onChange={(e) => setQrForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="input-base"
              placeholder="2026-12-31T23:59:59.000Z"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Max registrations (optional)</label>
            <input
              type="number"
              min={0}
              value={qrForm.maxRegistrations}
              onChange={(e) => setQrForm((f) => ({ ...f, maxRegistrations: e.target.value }))}
              className="input-base"
              placeholder="e.g. 200"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">QR mode</label>
            <select className="input-base" value={qrMode} onChange={(e) => setQrMode(e.target.value as any)}>
              <option value="WEB_FORM">Web form (recommended)</option>
              <option value="WHATSAPP_DEEP_LINK">WhatsApp deep-link</option>
            </select>
          </div>
        </div>

        {qrError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{qrError}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={generateQr} disabled={qrLoading} className="btn-primary">
            {qrLoading ? 'Working…' : activeQr ? 'Generate new QR' : 'Generate QR'}
          </button>
          <button type="button" onClick={rotateQr} disabled={qrLoading || !activeQr} className="btn-secondary">
            Regenerate (rotate)
          </button>
        </div>

        {activeQr && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col items-center gap-3">
              <img
                src={activeQr.imageUrl}
                alt="School QR code"
                className="h-[260px] w-[260px] rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700"
                loading="lazy"
              />
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Link</p>
                <p className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-slate-100">
                  {(activeQr as any).joinUrl || activeQr.inviteUrl}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a href={activeQr.imageUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                  Download QR (PNG)
                </a>
                {(activeQr as any).a4ImageUrl && (
                  <a href={(activeQr as any).a4ImageUrl as string} target="_blank" rel="noreferrer" className="btn-secondary">
                    Download A4 PNG
                  </a>
                )}
                {waShareUrl && (
                  <a href={waShareUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                    Share WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const text = String((activeQr as any).joinUrl || activeQr.inviteUrl || '');
                    void navigator.clipboard?.writeText(text);
                  }}
                >
                  Copy link
                </button>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Scans: {activeQr.scanCount ?? 0}</span>
                <span>Registered: {activeQr.registrationCount ?? 0}</span>
                <span>Abandoned: {Math.max(0, (activeQr.scanCount ?? 0) - (activeQr.registrationCount ?? 0))}</span>
                <span>
                  Scan → registration:{' '}
                  {activeQr.scanCount ? Math.round(((activeQr.registrationCount ?? 0) / (activeQr.scanCount ?? 1)) * 100) : 0}%
                </span>
                {activeQr.expiresAt ? <span>Expires: {String(activeQr.expiresAt)}</span> : <span>No expiry</span>}
                {activeQr.maxRegistrations ? <span>Max: {activeQr.maxRegistrations}</span> : <span>No limit</span>}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Premium: personalised QR (CSV roster)</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Paste CSV with headers <span className="font-mono">childFirstName,childSurname,class</span>.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="childFirstName,childSurname,class\nLiam,Smith,Rainbow Room"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={generatePersonalised} disabled={qrLoading || !csvText.trim()} className="btn-secondary">
              {qrLoading ? 'Working…' : 'Generate personalised QRs'}
            </button>
            {csvResult && (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Generated: <span className="font-semibold">{csvResult.createdCount}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
