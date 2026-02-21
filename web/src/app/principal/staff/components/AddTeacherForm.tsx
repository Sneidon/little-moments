'use client';

import type { AddTeacherFormState } from '@/hooks/useStaffPage';

export interface AddTeacherFormProps {
  form: AddTeacherFormState;
  setForm: React.Dispatch<React.SetStateAction<AddTeacherFormState>>;
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function AddTeacherForm({
  form,
  setForm,
  error,
  submitting,
  onSubmit,
  onCancel,
}: AddTeacherFormProps) {
  return (
    <form onSubmit={onSubmit} className="card mb-8 p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">Add teacher</h2>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
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
            placeholder="e.g. What children call them"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input
            type="password"
            value={form.teacherPassword}
            onChange={(e) => setForm((f) => ({ ...f, teacherPassword: e.target.value }))}
            className="input-base"
            placeholder="Min 6 characters"
            minLength={6}
            required
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : 'Add teacher'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
