import type { EditFormState } from '@/hooks/useParentsManagement';
import { FORM_BOX, FormError, LabeledInput } from './parentFormParts';

type Props = {
  form: EditFormState;
  setForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  submitting?: boolean;
  error?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function EditParentForm({ form, setForm, submitting, error, onSubmit, onCancel }: Props) {
  return (
    <form onSubmit={onSubmit} className={`mb-6 ${FORM_BOX}`}>
      <h3 className="font-medium text-slate-800 dark:text-slate-100">Edit parent</h3>
      <FormError message={error} />
      <LabeledInput label="Display name" value={form.displayName} onChange={(v) => setForm((f) => ({ ...f, displayName: v }))} required />
      <LabeledInput label="Phone" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="Optional" />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="editParentIsActive"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="editParentIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Active
        </label>
      </div>
      <div className="flex gap-2">
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
