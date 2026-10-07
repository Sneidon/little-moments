type Props = {
  allergies: string[];
  input: string;
  onInputChange: (value: string) => void;
  onChange: (allergies: string[]) => void;
};

export function AllergyInput({ allergies, input, onInputChange, onChange }: Props) {
  const add = () => {
    const value = input.trim();
    if (value && !allergies.includes(value)) {
      onChange([...allergies, value]);
      onInputChange('');
    }
  };

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Allergies</label>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add allergy (e.g. Peanuts)"
          className="input-base min-w-[140px] flex-1"
        />
        <button type="button" onClick={add} className="btn-secondary">
          Add
        </button>
      </div>
      {allergies.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {allergies.map((a, idx) => (
            <li
              key={idx}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/50 px-3 py-1 text-sm text-primary-800 dark:text-primary-200"
            >
              {a}
              <button
                type="button"
                onClick={() => onChange(allergies.filter((_, i) => i !== idx))}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
