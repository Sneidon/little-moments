'use client';

export interface AddSuperAdminFormState {
  email: string;
  displayName: string;
  password: string;
}

export interface AddSuperAdminFormProps {
  form: AddSuperAdminFormState;
  setForm: React.Dispatch<React.SetStateAction<AddSuperAdminFormState>>;
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function AddSuperAdminForm({
  form,
  setForm,
  error,
  submitting,
  onSubmit,
  onCancel,
}: AddSuperAdminFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-800 dark:text-slate-100">Add super admin</h2>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="input-base"
            placeholder="admin@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="input-base"
            placeholder="e.g. Jane Admin"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="input-base"
            placeholder="Min 6 characters"
            minLength={6}
            required
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : 'Add super admin'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
