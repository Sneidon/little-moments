import { useState } from 'react';
import { ParentLinkOrInvitePanel, type ConfirmedParentAssignment } from '@/components/ParentLinkOrInvitePanel';
import { MAX_PARENTS } from '@/constants/parents';

type Props = {
  childName: string;
  parents: ConfirmedParentAssignment[];
  onChange: React.Dispatch<React.SetStateAction<ConfirmedParentAssignment[]>>;
};

export function PendingParentsSection({ childName, parents, onChange }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState('');
  const canAdd = parents.length < MAX_PARENTS;

  const add = (parent: ConfirmedParentAssignment) => {
    const email = parent.parentEmail.trim().toLowerCase();
    if (parents.some((p) => p.parentEmail.trim().toLowerCase() === email)) {
      setError('That parent email is already in the list.');
      return;
    }
    if (!canAdd) {
      setError(`Maximum ${MAX_PARENTS} parents allowed.`);
      return;
    }
    setError('');
    onChange((prev) => [...prev, parent]);
    setPanelOpen(false);
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-600">
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Parents (optional)</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Search by email first. Existing parents are linked immediately; if no account is found, an invite email is sent when you save
        the child.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {parents.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {parents.map((parent) => (
            <li
              key={parent.parentEmail}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-700/30"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100">{parent.parentEmail}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {parent.mode === 'link' ? 'Existing account — link on save' : 'No account — invite email on save'}
                  {parent.parentDisplayName ? ` · ${parent.parentDisplayName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((p) => p.parentEmail !== parent.parentEmail))}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!canAdd ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Maximum {MAX_PARENTS} parents reached.</p>
      ) : panelOpen ? (
        <div className="mt-4">
          <ParentLinkOrInvitePanel
            childLabel={childName.trim() ? ` to ${childName.trim()}` : ' to this child'}
            confirmLinkLabel="Add to list"
            confirmInviteLabel="Add to list"
            onConfirm={add}
            onCancel={() => setPanelOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError('');
            setPanelOpen(true);
          }}
          className="btn-secondary mt-4"
        >
          Add / link parent now
        </button>
      )}
    </div>
  );
}
