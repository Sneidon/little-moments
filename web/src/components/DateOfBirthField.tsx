'use client';

import { useEffect, useState } from 'react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12 || !Number.isFinite(year)) return 31;
  return new Date(year, month, 0).getDate();
}

function parseIsoDate(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12) return null;
  const dim = daysInMonth(y, mo);
  if (d < 1 || d > dim) return null;
  return { y, m: mo, d };
}

export function isValidIsoDateString(v: string): boolean {
  return parseIsoDate(v) !== null;
}

type Part = number | '';

export interface DateOfBirthFieldProps {
  /** Stored as YYYY-MM-DD or empty */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  required?: boolean;
  inputClassName: string;
  /** Affects screen-reader labels and year range (enrollment allows next calendar year). */
  purpose?: 'birth' | 'enrollment';
}

export function DateOfBirthField({
  value,
  onChange,
  id,
  required,
  inputClassName,
  purpose = 'birth',
}: DateOfBirthFieldProps) {
  const nowY = new Date().getFullYear();
  const maxYear = purpose === 'enrollment' ? nowY + 1 : nowY;
  const minYear = maxYear - 100;

  const legend =
    purpose === 'enrollment' ? 'How to enter enrollment date' : 'How to enter date of birth';
  const monthAria = purpose === 'enrollment' ? 'Enrollment month' : 'Birth month';
  const dayAria = purpose === 'enrollment' ? 'Enrollment day' : 'Birth day';
  const yearAria = purpose === 'enrollment' ? 'Enrollment year' : 'Birth year';
  const autoComplete = purpose === 'enrollment' ? 'off' : 'bday';

  const [mode, setMode] = useState<'pickers' | 'text'>('pickers');
  const [pickY, setPickY] = useState<Part>('');
  const [pickM, setPickM] = useState<Part>('');
  const [pickD, setPickD] = useState<Part>('');

  useEffect(() => {
    const p = parseIsoDate(value);
    if (p) {
      setPickY(p.y);
      setPickM(p.m);
      setPickD(p.d);
    } else if (!value) {
      setPickY('');
      setPickM('');
      setPickD('');
    }
  }, [value]);

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  const applyPickers = (next: { y?: Part; m?: Part; d?: Part }) => {
    const ny = next.y !== undefined ? next.y : pickY;
    const nm = next.m !== undefined ? next.m : pickM;
    const nd = next.d !== undefined ? next.d : pickD;

    if (ny === '' || nm === '' || nd === '') {
      if (next.y !== undefined) setPickY(ny);
      if (next.m !== undefined) setPickM(nm);
      if (next.d !== undefined) setPickD(nd);
      onChange('');
      return;
    }

    let day = nd;
    const dim = daysInMonth(ny, nm);
    if (day > dim) day = dim;

    setPickY(ny);
    setPickM(nm);
    setPickD(day);

    onChange(`${ny}-${pad2(nm)}-${pad2(day)}`);
  };

  const dim =
    pickY !== '' && pickM !== '' ? daysInMonth(pickY, pickM) : 31;
  const dayOptions = Array.from({ length: dim }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <fieldset className="flex flex-wrap gap-4 border-0 p-0">
        <legend className="sr-only">{legend}</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name={`${id ?? 'dob'}-mode`}
            className="text-primary-600"
            checked={mode === 'pickers'}
            onChange={() => setMode('pickers')}
          />
          Month, day & year
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name={`${id ?? 'dob'}-mode`}
            className="text-primary-600"
            checked={mode === 'text'}
            onChange={() => setMode('text')}
          />
          Type date
        </label>
      </fieldset>

      {mode === 'text' ? (
        <div>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete={autoComplete}
            placeholder="YYYY-MM-DD"
            pattern={required ? '\\d{4}-\\d{2}-\\d{2}' : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
            required={required}
            aria-describedby={id ? `${id}-hint` : undefined}
          />
          <p id={id ? `${id}-hint` : undefined} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Example: 2018-03-24
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 sm:flex-none sm:w-36">
            <label htmlFor={id ? `${id}-m` : undefined} className="sr-only">
              Month
            </label>
            <select
              id={id ? `${id}-m` : undefined}
              value={pickM === '' ? '' : String(pickM)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') applyPickers({ m: '' });
                else applyPickers({ m: Number(raw) });
              }}
              className={inputClassName}
              required={required}
              aria-label={monthAria}
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={String(idx + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:flex-none sm:w-20">
            <label htmlFor={id ? `${id}-d` : undefined} className="sr-only">
              Day
            </label>
            <select
              id={id ? `${id}-d` : undefined}
              value={pickD === '' ? '' : String(pickD)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') applyPickers({ d: '' });
                else applyPickers({ d: Number(raw) });
              }}
              className={inputClassName}
              required={required}
              aria-label={dayAria}
            >
              <option value="">Day</option>
              {dayOptions.map((day) => (
                <option key={day} value={String(day)}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:flex-none sm:w-28">
            <label htmlFor={id ? `${id}-y` : undefined} className="sr-only">
              Year
            </label>
            <select
              id={id ? `${id}-y` : undefined}
              value={pickY === '' ? '' : String(pickY)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') applyPickers({ y: '' });
                else applyPickers({ y: Number(raw) });
              }}
              className={inputClassName}
              required={required}
              aria-label={yearAria}
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
