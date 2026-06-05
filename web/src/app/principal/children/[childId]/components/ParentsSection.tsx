import Link from 'next/link';
import type { UserProfile } from 'shared/types';
import type {
  EmailParentInviteFormState,
  InviteFormState,
  EditFormState,
  InviteStep,
} from '@/hooks/useParentsManagement';
import { SectionCard } from '@/components/ui';
import { IconMail, IconPhone, IconUser } from '@/components/icons/AdminIcons';

function getInitials(p: UserProfile): string {
  const name = (p.displayName ?? '').trim();
  if (name.length >= 2) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = (p.email ?? '').trim();
  if (email.length >= 1) return email[0].toUpperCase();
  return '?';
}

export interface ParentsSectionProps {
  childName?: string;
  maxParents: number;
  parents: UserProfile[];
  /** When true, only show the list of parents (no invite/edit). Used for admin read-only view. */
  readOnly?: boolean;
  /** When provided, each parent card shows a "View profile" link to this URL (e.g. principal parent detail). */
  getParentProfileHref?: (parent: UserProfile) => string;
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
  /** Open confirm on child page — removes parent from this child only. */
  onRequestRemoveParentFromChild?: (p: UserProfile) => void;
  removingParentUid?: string | null;
  showEmailInvite?: boolean;
  emailInviteForm?: EmailParentInviteFormState;
  setEmailInviteForm?: React.Dispatch<React.SetStateAction<EmailParentInviteFormState>>;
  emailInviteSubmitting?: boolean;
  emailInviteError?: string;
  emailInviteSuccessExpires?: string | null;
  onEmailInviteSubmit?: (e: React.FormEvent) => Promise<void>;
  openEmailInvite?: () => void;
  closeEmailInvite?: () => void;
}

export function ParentsSection({
  childName,
  maxParents,
  parents,
  readOnly = false,
  getParentProfileHref,
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
  onRequestRemoveParentFromChild,
  removingParentUid = null,
  showEmailInvite = false,
  emailInviteForm,
  setEmailInviteForm,
  emailInviteSubmitting,
  emailInviteError,
  emailInviteSuccessExpires,
  onEmailInviteSubmit,
  openEmailInvite,
  closeEmailInvite,
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

  const removing = Boolean(removingParentUid);

  const parentCardContent = (p: UserProfile, isReadOnly: boolean) => (
    <>
      <div className="flex shrink-0 items-center justify-center h-11 w-11 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold">
        {p.photoURL ? (
          <img src={p.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          getInitials(p)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{p.displayName ?? '—'}</span>
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
        <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <IconMail className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <a href={`mailto:${p.email}`} className="text-primary-600 dark:text-primary-400 hover:underline truncate">
              {p.email}
            </a>
          </span>
          {p.phone ? (
            <span className="flex items-center gap-2">
              <IconPhone className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              <a href={`tel:${p.phone}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                {p.phone}
              </a>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <IconPhone className="h-4 w-4 shrink-0" />
              No phone
            </span>
          )}
        </div>
      </div>
      {!isReadOnly && (onStartEditParent || getParentProfileHref) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {getParentProfileHref?.(p) && (
            <Link
              href={getParentProfileHref(p)}
              className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <IconUser className="h-4 w-4" />
              View profile
            </Link>
          )}
          {onStartEditParent && (
            <button
              type="button"
              onClick={() => onStartEditParent(p)}
              disabled={removing}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
            >
              Edit
            </button>
          )}
          {onRequestRemoveParentFromChild && (
            <button
              type="button"
              onClick={() => onRequestRemoveParentFromChild(p)}
              disabled={removing}
              className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {removingParentUid === p.uid ? 'Removing…' : 'Remove from child'}
            </button>
          )}
        </div>
      )}
    </>
  );

  if (readOnly) {
    return (
      <SectionCard topBar="warm" padding="default" className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Up to {maxParents} parents per child.
        </p>
        {parents.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No parents linked.</p>
        ) : (
          <ul className="space-y-4">
            {parents.map((p) => (
              <li
                key={p.uid}
                className="flex flex-wrap items-start gap-4 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-4"
              >
                {parentCardContent(p, true)}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard topBar="warm" padding="default" className="mb-8">
      <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Up to {maxParents} parents per child. Invited parents can sign in and view this child&apos;s reports.
      </p>

      {parents.length === 0 && !showInviteParent && !showEmailInvite && canInviteMore && (
        <div className="mb-6 rounded-card border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-8 px-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">No parents linked yet.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add a parent now (with a password or by linking an existing account), or send an email invite so they set
            their own password.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeEmailInvite?.();
                setShowInviteParent?.(true);
              }}
              className="btn-primary hidden"
              aria-hidden
            >
              Add / link parent now
            </button>
            <button type="button" onClick={() => openEmailInvite?.()} className="btn-secondary">
              Invite by email
            </button>
          </div>
        </div>
      )}

      {parents.length > 0 && (
        <ul className="mb-6 space-y-4">
          {parents.map((p) => (
            <li
              key={p.uid}
              className="flex flex-wrap items-start gap-4 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 px-4 py-4"
            >
              {parentCardContent(p, false)}
            </li>
          ))}
        </ul>
      )}

      {editingParentUid ? (
        <form
          onSubmit={(e) => onUpdateParentSubmit?.(e)}
          className="mb-6 max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
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

      {canInviteMore && (parents.length > 0 || showInviteParent || showEmailInvite) ? (
        <>
          {showEmailInvite ? (
            <form
              onSubmit={(e) => onEmailInviteSubmit?.(e)}
              className="mb-6 max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
            >
              <h3 className="font-medium text-slate-800 dark:text-slate-100">Invite parent by email</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                We&apos;ll email them a link to set their password and link to this child{childLabel}. They aren&apos;t
                added until they accept.
              </p>
              {emailInviteSuccessExpires ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100 dark:bg-green-900/20 dark:text-green-200 dark:ring-green-800">
                  <p className="font-semibold">Invite sent.</p>
                  <p className="mt-1 font-mono text-xs">Expires: {emailInviteSuccessExpires}</p>
                </div>
              ) : null}
              {emailInviteError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{emailInviteError}</p>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={emailInviteForm?.parentEmail ?? ''}
                  onChange={(e) => setEmailInviteForm?.((f) => ({ ...f, parentEmail: e.target.value }))}
                  className="input-base"
                  placeholder="parent@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Display name (optional)
                </label>
                <input
                  type="text"
                  value={emailInviteForm?.parentDisplayName ?? ''}
                  onChange={(e) => setEmailInviteForm?.((f) => ({ ...f, parentDisplayName: e.target.value }))}
                  className="input-base"
                  placeholder="Used in greeting and profile"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone (optional)</label>
                <input
                  type="tel"
                  value={emailInviteForm?.parentPhone ?? ''}
                  onChange={(e) => setEmailInviteForm?.((f) => ({ ...f, parentPhone: e.target.value }))}
                  className="input-base"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={emailInviteSubmitting} className="btn-primary">
                  {emailInviteSubmitting ? 'Sending…' : 'Send invite email'}
                </button>
                <button type="button" onClick={() => closeEmailInvite?.()} className="btn-secondary">
                  Close
                </button>
              </div>
            </form>
          ) : !showInviteParent ? (
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  closeEmailInvite?.();
                  setShowInviteParent?.(true);
                }}
                className="btn-primary hidden"
                aria-hidden
              >
                Add / link parent now
              </button>
              <button type="button" onClick={() => openEmailInvite?.()} className="btn-secondary">
                Invite by email
              </button>
            </div>
          ) : inviteStep === 'email' ? (
            <form
              onSubmit={(e) => onCheckEmail?.(e)}
              className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
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
              className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
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
              className="max-w-md space-y-3 rounded-card border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/30 p-4"
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
    </SectionCard>
  );
}
