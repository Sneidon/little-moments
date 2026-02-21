'use client';

import type { EditTeacherFormState } from '@/hooks/useStaffPage';

export interface EditTeacherFormProps {
  form: EditTeacherFormState;
  setForm: React.Dispatch<React.SetStateAction<EditTeacherFormState>>;
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function EditTeacherForm({
  form,
  setForm,
  error,
  submitting,
  onSubmit,
  onCancel,
}: EditTeacherFormProps) {
  return (
    <form onSubmit={onSubmit} className="card mb-8 p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">Edit teacher</h2>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="input-base"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred name</label>
          <input
            type="text"
            value={form.preferredName}
            onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
            className="input-base"
            placeholder="Optional"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="editIsActive"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="editIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Active (inactive teachers cannot be assigned to new classes)
          </label>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
