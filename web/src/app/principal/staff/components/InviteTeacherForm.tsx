'use client';

import type { InviteTeacherFormState } from '@/hooks/useStaffPage';

export interface InviteTeacherFormProps {
  form: InviteTeacherFormState;
  setForm: React.Dispatch<React.SetStateAction<InviteTeacherFormState>>;
  error: string;
  submitting: boolean;
  inviteResult: { expiresAt: string } | null;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function InviteTeacherForm({
  form,
  setForm,
  error,
  submitting,
  inviteResult,
  onSubmit,
  onCancel,
}: InviteTeacherFormProps) {
  return (
    <form onSubmit={onSubmit} className="card mb-8 p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">Invite teacher</h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Sends an email with a secure link. They choose their password when they accept — similar to onboarding a principal.
      </p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {inviteResult && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
          <p className="font-semibold">Invite sent.</p>
          <p className="mt-1 font-mono text-xs opacity-90">Expires: {inviteResult.expiresAt}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={form.teacherEmail}
            onChange={(e) => setForm((f) => ({ ...f, teacherEmail: e.target.value }))}
            className="input-base"
            placeholder="teacher@school.com"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
          <input
            type="text"
            value={form.teacherDisplayName}
            onChange={(e) => setForm((f) => ({ ...f, teacherDisplayName: e.target.value }))}
            className="input-base"
            placeholder="e.g. Jane Smith"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred name</label>
          <input
            type="text"
            value={form.teacherPreferredName}
            onChange={(e) => setForm((f) => ({ ...f, teacherPreferredName: e.target.value }))}
            className="input-base"
            placeholder="Optional — shown to children"
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Close
        </button>
      </div>
    </form>
  );
}
