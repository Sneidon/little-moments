import { SectionCard } from '@/components/ui';
import { hasInviteFilters, type InviteFilterState } from './inviteUtils';

type Props = {
  value: InviteFilterState;
  onChange: (value: InviteFilterState) => void;
  roles: { value: string; label: string }[];
  roleSelectWidth: string;
  searchPlaceholder: string;
  shown: number;
  total: number;
};

const LABEL = 'mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400';

export function InviteFilters({ value, onChange, roles, roleSelectWidth, searchPlaceholder, shown, total }: Props) {
  const filtered = hasInviteFilters(value);
  return (
    <SectionCard topBar="warm" padding="default" className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
        {filtered && (
          <button
            type="button"
            onClick={() => onChange({ status: 'all', role: 'all', search: '' })}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={LABEL}>Status</label>
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as InviteFilterState['status'] })}
            className="input-base min-w-[160px]"
          >
            <option value="all">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Role</label>
          <select value={value.role} onChange={(e) => onChange({ ...value, role: e.target.value })} className={`input-base ${roleSelectWidth}`}>
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[min(100%,280px)] flex-1">
          <label className={LABEL}>Search</label>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="input-base w-full max-w-md"
          />
        </div>
      </div>
      {filtered && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Showing {shown} of {total} invites
        </p>
      )}
    </SectionCard>
  );
}
