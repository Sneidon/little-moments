import type { ChildGender, ClassRoom } from 'shared/types';
import { DateOfBirthField } from '@/components/DateOfBirthField';
import { formatClassDisplay } from '@/lib/formatClass';
import { GENDER_FORM_OPTIONS } from '@/lib/formatGender';
import type { ChildFormState } from '../childForm';
import { AllergyInput } from './AllergyInput';

type Props = {
  form: ChildFormState;
  setForm: React.Dispatch<React.SetStateAction<ChildFormState>>;
  classes: ClassRoom[];
};

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';
const REQUIRED = <span className="text-red-600 dark:text-red-400">*</span>;

export function ChildFormFields({ form, setForm, classes }: Props) {
  const set = <K extends keyof ChildFormState>(key: K, value: ChildFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={LABEL}>Name</label>
        <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input-base" required />
      </div>
      <div>
        <label className={LABEL}>Preferred name</label>
        <input
          type="text"
          value={form.preferredName}
          onChange={(e) => set('preferredName', e.target.value)}
          placeholder="Optional"
          className="input-base"
        />
      </div>
      <div>
        <span className={LABEL}>Date of birth</span>
        <DateOfBirthField
          id="child-dob"
          value={form.dateOfBirth}
          onChange={(iso) => set('dateOfBirth', iso)}
          required
          inputClassName="input-base w-full"
        />
      </div>
      <div>
        <label className={LABEL}>Gender</label>
        <select value={form.gender} onChange={(e) => set('gender', e.target.value as '' | ChildGender)} className="input-base">
          <option value="">—</option>
          {GENDER_FORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className={LABEL}>Enrollment date</span>
        <DateOfBirthField
          id="child-enrollment"
          purpose="enrollment"
          value={form.enrollmentDate}
          onChange={(iso) => set('enrollmentDate', iso)}
          required={false}
          inputClassName="input-base w-full"
        />
      </div>
      <div>
        <label className={LABEL}>Class / room</label>
        <select value={form.classId} onChange={(e) => set('classId', e.target.value)} className="input-base">
          <option value="">—</option>
          {classes.map((r) => (
            <option key={r.id} value={r.id}>
              {formatClassDisplay(r)}
            </option>
          ))}
        </select>
      </div>
      <AllergyInput
        allergies={form.allergies}
        input={form.allergyInput}
        onInputChange={(v) => set('allergyInput', v)}
        onChange={(list) => set('allergies', list)}
      />
      <div className="sm:col-span-2 flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/40 px-4 py-3">
        <input
          type="checkbox"
          id="child-is-active"
          checked={form.isActive}
          onChange={(e) => {
            const next = e.target.checked;
            setForm((f) => ({ ...f, isActive: next, classId: next ? f.classId : '' }));
          }}
          className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
        />
        <div>
          <label htmlFor="child-is-active" className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Enrolled at this school (active roster)
          </label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Untick when the child has left — they are removed from their class roster, disappear from teacher and parent class lists,
            and parents stop seeing this profile.
          </p>
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Medical notes</label>
        <textarea
          value={form.medicalNotes}
          onChange={(e) => set('medicalNotes', e.target.value)}
          rows={2}
          placeholder="Optional medical or care notes"
          className="input-base resize-y"
        />
      </div>
      <div>
        <label className={LABEL}>Emergency contact name {REQUIRED}</label>
        <input
          type="text"
          value={form.emergencyContactName}
          onChange={(e) => set('emergencyContactName', e.target.value)}
          placeholder="e.g. Parent or guardian name"
          className="input-base"
          required
          autoComplete="name"
        />
      </div>
      <div>
        <label className={LABEL}>Emergency contact phone {REQUIRED}</label>
        <input
          type="tel"
          value={form.emergencyContact}
          onChange={(e) => set('emergencyContact', e.target.value)}
          placeholder="Phone number"
          className="input-base"
          required
          autoComplete="tel"
        />
      </div>
    </div>
  );
}
