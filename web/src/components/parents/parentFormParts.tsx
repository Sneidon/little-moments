export const FORM_BOX = 'max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4';

type InputProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
};

export function LabeledInput({ label, value, onChange, type = 'text', placeholder, required, readOnly }: InputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        className={readOnly ? 'input-base cursor-not-allowed bg-slate-100 dark:bg-slate-700' : 'input-base'}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600 dark:text-red-400">{message}</p> : null;
}
