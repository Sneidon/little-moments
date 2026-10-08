export const INPUT =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
};

export function Field({ label, value, onChange, type = 'text', placeholder, required, wide }: FieldProps) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} placeholder={placeholder} required={required} />
    </div>
  );
}
