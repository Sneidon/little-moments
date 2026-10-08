import type { JoinRegistration } from './useJoinRegistration';

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';
const TITLE = 'font-display text-xl font-extrabold text-slate-900 dark:text-slate-50';

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input className="input-base" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function ParentStep({ r }: { r: JoinRegistration }) {
  const set = (key: 'name' | 'mobile' | 'email') => (v: string) => r.setParent((p) => ({ ...p, [key]: v }));
  return (
    <div className="mt-5 space-y-4">
      <h1 className={TITLE}>Parent info</h1>
      <Field label="Full name" value={r.parent.name} onChange={set('name')} />
      <Field label="Mobile number" value={r.parent.mobile} onChange={set('mobile')} placeholder="0xx xxx xxxx or +27xx xxx xxxx" />
      <Field label="Email" type="email" value={r.parent.email} onChange={set('email')} />
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={r.parent.whatsappOptIn} onChange={(e) => r.setParent((p) => ({ ...p, whatsappOptIn: e.target.checked }))} />
        WhatsApp opt-in
      </label>
    </div>
  );
}

export function ChildStep({ r }: { r: JoinRegistration }) {
  const set = (key: 'firstName' | 'surname' | 'dob' | 'classId') => (v: string) => r.setChild((c) => ({ ...c, [key]: v }));
  return (
    <div className="mt-5 space-y-4">
      <h1 className={TITLE}>Child info</h1>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={r.child.firstName} onChange={set('firstName')} />
        <Field label="Surname" value={r.child.surname} onChange={set('surname')} />
      </div>
      <Field label="Date of birth" type="date" value={r.child.dob} onChange={set('dob')} />
      <div>
        <label className={LABEL}>Class</label>
        <select className="input-base" value={r.child.classId} onChange={(e) => set('classId')(e.target.value)} disabled={r.loadingClasses}>
          <option value="">{r.loadingClasses ? 'Loading…' : 'Select a class'}</option>
          {r.suggestedClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Classes are suggested based on your child’s age (from DOB).</p>
      </div>
    </div>
  );
}

export function ConsentStep({ r }: { r: JoinRegistration }) {
  return (
    <div className="mt-5 space-y-4">
      <h1 className={TITLE}>Photo & consent</h1>
      <div>
        <label className={LABEL}>Child photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void r.uploadPhoto(f);
          }}
        />
        {r.photo.uploading && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Uploading…</p>}
        {r.photo.url && <img src={r.photo.url} alt="Uploaded child" className="mt-3 h-24 w-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />}
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={r.popiaConsent} onChange={(e) => r.setPopiaConsent(e.target.checked)} className="mt-1" />
        <span>
          I consent to the processing of my child’s data in line with POPIA.{' '}
          <a href="/privacy" className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">
            View privacy policy
          </a>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your child’s privacy is protected under POPIA.</div>
        </span>
      </label>
    </div>
  );
}

export function DoneStep({ teacherName }: { teacherName: string | null | undefined }) {
  return (
    <div className="mt-5 space-y-3 text-center">
      <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">You’re in!</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {teacherName ? `${teacherName} will approve your account shortly.` : 'A teacher will approve your account shortly.'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Once approved, you’ll be able to log in and see your child’s latest moments.</p>
    </div>
  );
}
