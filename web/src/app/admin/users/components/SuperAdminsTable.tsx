import { ResetPasswordButton } from '@/components/PasswordReset';
import { SectionCard } from '@/components/ui';
import type { SuperAdminUser } from '../useAdminUsers';

type Props = {
  admins: SuperAdminUser[];
  currentUid: string | undefined;
  resettingUid: string | null;
  removingUid: string | null;
  onReset: (user: SuperAdminUser) => void;
  onRemove: (user: SuperAdminUser) => void;
};

const TH = 'px-4 py-3 font-medium text-slate-700 dark:text-slate-200';

function removeTitle(onlyOne: boolean, isSelf: boolean) {
  if (onlyOne) return 'Cannot remove the only super administrator';
  if (isSelf) return 'You cannot remove your own administrator account';
  return 'Remove administrator';
}

export function SuperAdminsTable({ admins, currentUid, resettingUid, removingUid, onReset, onRemove }: Props) {
  const busy = !!resettingUid || !!removingUid;
  const onlyOne = admins.length < 2;
  return (
    <SectionCard topBar="primary" padding="none" className="mb-6">
      <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
        Super admins
      </h2>
      <table className="data-table">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className={TH}>Display name</th>
            <th className={TH}>Email</th>
            <th className={`min-w-[12rem] text-right ${TH}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((u) => {
            const isSelf = u.uid === currentUid;
            return (
              <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.displayName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <ResetPasswordButton onClick={() => u.email && onReset(u)} disabled={busy || !u.email} sending={resettingUid === u.uid} />
                    <button
                      type="button"
                      onClick={() => onRemove(u)}
                      disabled={onlyOne || isSelf || busy}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      title={removeTitle(onlyOne, isSelf)}
                    >
                      {removingUid === u.uid ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}
