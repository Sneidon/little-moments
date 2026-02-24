import type { UserProfile } from 'shared/types';
import type { InviteFormState, EditFormState, InviteStep } from '@/hooks/useParentsManagement';

export interface ParentsSectionProps {
  childName?: string;
  maxParents: number;
  parents: UserProfile[];
  /** When true, only show the list of parents (no invite/edit). Used for admin read-only view. */
  readOnly?: boolean;
  canInviteMore?: boolean;
  showInviteParent?: boolean;
  setShowInviteParent?: (show: boolean) => void;
  inviteForm?: InviteFormState;
  setInviteForm?: React.Dispatch<React.SetStateAction<InviteFormState>>;
  inviteStep?: InviteStep;
  inviteCheckLoading?: boolean;
  inviteCheckError?: string;
  onCheckEmail?: (e: React.FormEvent) => Promise<void>;
  resetInviteToStep1?: () => void;
  inviteSubmitting?: boolean;
  inviteError?: string;
  setInviteError?: (msg: string) => void;
  onInviteSubmit?: (e: React.FormEvent) => Promise<void>;
  onStartEditParent?: (p: UserProfile) => void;
  editingParentUid?: string | null;
  editParentForm?: EditFormState;
  setEditParentForm?: React.Dispatch<React.SetStateAction<EditFormState>>;
  editParentSubmitting?: boolean;
  editParentError?: string;
  onUpdateParentSubmit?: (e: React.FormEvent) => Promise<void>;
  onCancelEdit?: () => void;
}

export function ParentsSection({
  childName,
  maxParents,
  parents,
  readOnly = false,
  canInviteMore = false,
  showInviteParent = false,
  setShowInviteParent,
  inviteForm,
  setInviteForm,
  inviteStep,
  inviteCheckLoading,
  inviteCheckError,
  onCheckEmail,
  resetInviteToStep1,
  inviteSubmitting,
  inviteError,
  setInviteError,
  onInviteSubmit,
  onStartEditParent,
  editingParentUid,
  editParentForm,
  setEditParentForm,
  editParentSubmitting,
  editParentError,
  onUpdateParentSubmit,
  onCancelEdit,
}: ParentsSectionProps) {
  const resetInviteForm = () => {
    setShowInviteParent?.(false);
    setInviteError?.('');
    setInviteForm?.({
      parentEmail: '',
      parentDisplayName: '',
      parentPhone: '',
      parentPassword: '',
    });
  };

  const childLabel = childName ? ` to ${childName}` : ' to this child';

  if (readOnly) {
    return (
      <section className="card mb-8 p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Up to {maxParents} parents per child.
        </p>
        {parents.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No parents linked.</p>
        ) : (
          <ul className="space-y-3">
            {parents.map((p) => (
              <li
                key={p.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-sm">{p.email}</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.isActive !== false
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {p.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {p.phone}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">No phone</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="card mb-8 p-6">
      <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Up to {maxParents} parents per child. Invited parents can sign in and view this child&apos;s reports.
      </p>

      {parents.length === 0 && !showInviteParent && canInviteMore && (
        <div className="mb-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-8 px-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">No parents linked yet.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invite a parent so they can sign in and view this child&apos;s daily activities.
          </p>
          <button type="button" onClick={() => setShowInviteParent?.(true)} className="btn-primary mt-4">
            Invite parent
          </button>
        </div>
      )}

      {parents.length > 0 && (
        <ul className="mb-6 space-y-3">
          {parents.map((p) => (
            <li
              key={p.uid}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
                <span className="text-slate-600 dark:text-slate-300 text-sm">{p.email}</span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.isActive !== false
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {p.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {p.phone}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">No phone</span>
                )}
                <button
                  type="button"
                  onClick={() => onStartEditParent?.(p)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingParentUid ? (
        <form
          onSubmit={(e) => onUpdateParentSubmit?.(e)}
          className="mb-6 max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
        >
          <h3 className="font-medium text-slate-800 dark:text-slate-100">Edit parent</h3>
          {editParentError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{editParentError}</p>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              type="text"
              value={editParentForm?.displayName ?? ''}
              onChange={(e) => setEditParentForm?.((f) => ({ ...f, displayName: e.target.value }))}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
            <input
              type="tel"
              value={editParentForm?.phone ?? ''}
              onChange={(e) => setEditParentForm?.((f) => ({ ...f, phone: e.target.value }))}
              className="input-base"
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editParentIsActive"
              checked={editParentForm?.isActive ?? false}
              onChange={(e) => setEditParentForm?.((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="editParentIsActive"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={editParentSubmitting} className="btn-primary">
              {editParentSubmitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => onCancelEdit?.()} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {canInviteMore && (parents.length > 0 || showInviteParent) ? (
        <>
          {!showInviteParent ? (
            <button type="button" onClick={() => setShowInviteParent?.(true)} className="btn-primary">
              Invite parent
            </button>
          ) : inviteStep === 'email' ? (
            <form
              onSubmit={(e) => onCheckEmail?.(e)}
              className="max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
            >
              <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent — Step 1</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Enter the parent&apos;s email. We&apos;ll check if they already have an account.
              </p>
              {inviteCheckError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{inviteCheckError}</p>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={inviteForm?.parentEmail ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentEmail: e.target.value }))}
                  className="input-base"
                  placeholder="parent@example.com"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={inviteCheckLoading} className="btn-primary">
                  {inviteCheckLoading ? 'Checking…' : 'Check for account'}
                </button>
                <button type="button" onClick={resetInviteForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : inviteStep === 'link' ? (
            <form
              onSubmit={(e) => onInviteSubmit?.(e)}
              className="max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
            >
              <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent — Link existing account</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>{inviteForm?.parentEmail}</strong> already has an account. Link them{childLabel}?
              </p>
              {inviteError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Display name
                </label>
                <input
                  type="text"
                  value={inviteForm?.parentDisplayName ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentDisplayName: e.target.value }))}
                  className="input-base"
                  placeholder="Optional — update how they appear"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="tel"
                  value={inviteForm?.parentPhone ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentPhone: e.target.value }))}
                  className="input-base"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={inviteSubmitting} className="btn-primary">
                  {inviteSubmitting ? 'Linking…' : 'Link parent'}
                </button>
                <button type="button" onClick={() => resetInviteToStep1?.()} className="btn-secondary">
                  Back
                </button>
                <button type="button" onClick={resetInviteForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => onInviteSubmit?.(e)}
              className="max-w-md space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
            >
              <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent — Create account</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No account found for this email. Create one and link them{childLabel}.
              </p>
              {inviteError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={inviteForm?.parentEmail ?? ''}
                  readOnly
                  className="input-base bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Display name
                </label>
                <input
                  type="text"
                  value={inviteForm?.parentDisplayName ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentDisplayName: e.target.value }))}
                  className="input-base"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="tel"
                  value={inviteForm?.parentPhone ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentPhone: e.target.value }))}
                  className="input-base"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  value={inviteForm?.parentPassword ?? ''}
                  onChange={(e) => setInviteForm?.((f) => ({ ...f, parentPassword: e.target.value }))}
                  className="input-base"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={inviteSubmitting} className="btn-primary">
                  {inviteSubmitting ? 'Creating…' : 'Create account & link'}
                </button>
                <button type="button" onClick={() => resetInviteToStep1?.()} className="btn-secondary">
                  Back
                </button>
                <button type="button" onClick={resetInviteForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      ) : null}

      {!canInviteMore && parents.length >= maxParents ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Maximum number of parents reached.</p>
      ) : null}
    </section>
  );
}
