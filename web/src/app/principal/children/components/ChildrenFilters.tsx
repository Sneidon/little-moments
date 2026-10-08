import type { ClassRoom } from 'shared/types';
import { SectionCard } from '@/components/ui';
import { formatClassDisplay } from '@/lib/formatClass';
import type { EnrollmentFilter } from '../childForm';

type Props = {
  classes: ClassRoom[];
  enrollment: EnrollmentFilter;
  classId: string;
  search: string;
  onEnrollmentChange: (value: EnrollmentFilter) => void;
  onClassChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  shownCount: number;
  totalCount: number;
};

const LABEL = 'text-sm font-medium text-slate-700 dark:text-slate-200';

export function ChildrenFilters(props: Props) {
  const { classes, enrollment, classId, search, shownCount, totalCount } = props;
  const filtered = !!classId || !!search.trim() || enrollment !== 'active';

  return (
    <SectionCard topBar="accent" padding="default" className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
        {filtered && (
          <button
            type="button"
            onClick={props.onClear}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className={LABEL}>Enrollment</label>
        <select
          value={enrollment}
          onChange={(e) => props.onEnrollmentChange(e.target.value as EnrollmentFilter)}
          className="input-base max-w-[200px]"
        >
          <option value="active">Enrolled only</option>
          <option value="inactive">Left school only</option>
          <option value="all">All children</option>
        </select>
        <label className={LABEL}>Class</label>
        <select value={classId} onChange={(e) => props.onClassChange(e.target.value)} className="input-base max-w-[220px]">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {formatClassDisplay(c)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="children-search">
          Search by name
        </label>
        <input
          id="children-search"
          type="search"
          value={search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Search by name…"
          className="input-base max-w-[200px]"
          aria-label="Search children by name"
        />
        {filtered && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {shownCount} of {totalCount} children
          </span>
        )}
      </div>
    </SectionCard>
  );
}
