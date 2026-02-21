import type { ClassRoom } from 'shared/types';
import type { UserProfile } from 'shared/types';
import type { ClassFormData } from '@/services/classes';

export interface ClassFormProps {
  editingId: string | null;
  form: ClassFormData;
  setForm: React.Dispatch<React.SetStateAction<ClassFormData>>;
  teachers: UserProfile[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export function ClassForm({
  editingId,
  form,
  setForm,
  teachers,
  submitting,
  onSubmit,
  onCancel,
}: ClassFormProps) {
  const activeTeachers = teachers.filter(
    (t) => t.role === 'principal' || (t.role === 'teacher' && t.isActive !== false)
  );

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm"
    >
      <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
        {editingId ? 'Edit class' : 'New class'}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Class name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Rainbow Room"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Min age (months)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.minAgeMonths ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                minAgeMonths: e.target.value.trim()
                  ? parseInt(e.target.value, 10)
                  : null,
              }))
            }
            placeholder="e.g. 24 or 48"
            className={inputClass}
          />
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Use months (e.g. 24). 2 yr+ shown as years (24 mo = 2 yr)
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Max age (months)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.maxAgeMonths ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                maxAgeMonths: e.target.value.trim()
                  ? parseInt(e.target.value, 10)
                  : null,
              }))
            }
            placeholder="e.g. 36 or 60"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Assigned teacher
          </label>
          <select
            value={form.assignedTeacherId ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                assignedTeacherId: e.target.value.trim() || null,
              }))
            }
            className={inputClass}
          >
            <option value="">—</option>
            {activeTeachers.map((t) => (
              <option key={t.uid} value={t.uid}>
                {t.displayName} ({t.role})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : editingId ? 'Save' : 'Add class'}
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
