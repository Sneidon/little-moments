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
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm"
    >
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Add teacher</h2>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={form.teacherEmail}
            onChange={(e) => setForm((f) => ({ ...f, teacherEmail: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="teacher@school.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
          <input
            type="text"
            value={form.teacherDisplayName}
            onChange={(e) => setForm((f) => ({ ...f, teacherDisplayName: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g. Jane Smith"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred name</label>
          <input
            type="text"
            value={form.teacherPreferredName}
            onChange={(e) => setForm((f) => ({ ...f, teacherPreferredName: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g. What children call them"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input
            type="password"
            value={form.teacherPassword}
            onChange={(e) => setForm((f) => ({ ...f, teacherPassword: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Min 6 characters"
            minLength={6}
            required
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add teacher'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
