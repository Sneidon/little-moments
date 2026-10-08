import type { UserProfile } from 'shared/types';
import type {
  InviteFormState,
  EditFormState,
  InviteStep,
} from '@/hooks/useParentsManagement';
import { SectionCard } from '@/components/ui';
import { EditParentForm } from './EditParentForm';
import { ParentCard } from './ParentCard';
import { ParentInviteSteps } from './ParentInviteSteps';

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
}: ParentsSectionProps) {
  const resetInviteForm = () => {
    setShowInviteParent?.(false);
    setInviteError?.('');
    setInviteForm?.({
      parentEmail: '',
      parentDisplayName: '',
      parentPhone: '',
    });
  };

  const childLabel = childName ? ` to ${childName}` : ' to this child';

  const removing = Boolean(removingParentUid);

  const cards = (isReadOnly: boolean) =>
    parents.map((p) => (
      <ParentCard
        key={p.uid}
        parent={p}
        readOnly={isReadOnly}
        profileHref={getParentProfileHref?.(p)}
        removing={removing}
        isRemovingThis={removingParentUid === p.uid}
        onEdit={onStartEditParent}
        onRemove={onRequestRemoveParentFromChild}
      />
    ));

  if (readOnly) {
    return (
      <SectionCard topBar="warm" padding="default" className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Up to {maxParents} parents per child.</p>
        {parents.length === 0 ? <p className="text-slate-500 dark:text-slate-400">No parents linked.</p> : <ul className="space-y-4">{cards(true)}</ul>}
      </SectionCard>
    );
  }

  const addButton = (
    <button type="button" onClick={() => setShowInviteParent?.(true)} className="btn-primary">
      Add / link parent now
    </button>
  );

  return (
    <SectionCard topBar="warm" padding="default" className="mb-8">
      <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Parents</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Up to {maxParents} parents per child. Invited parents can sign in and view this child&apos;s reports.
      </p>

      {parents.length === 0 && !showInviteParent && canInviteMore && (
        <div className="mb-6 rounded-card border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-8 px-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">No parents linked yet.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search by email first. Link existing parents immediately, or send an invite if they don&apos;t have an account yet.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{addButton}</div>
        </div>
      )}

      {parents.length > 0 && <ul className="mb-6 space-y-4">{cards(false)}</ul>}

      {editingParentUid && editParentForm && setEditParentForm ? (
        <EditParentForm
          form={editParentForm}
          setForm={setEditParentForm}
          submitting={editParentSubmitting}
          error={editParentError}
          onSubmit={(e) => onUpdateParentSubmit?.(e)}
          onCancel={() => onCancelEdit?.()}
        />
      ) : null}

      {canInviteMore && (parents.length > 0 || showInviteParent) && inviteForm && setInviteForm ? (
        showInviteParent ? (
          <ParentInviteSteps
            step={inviteStep}
            childLabel={childLabel}
            form={inviteForm}
            setForm={setInviteForm}
            checkLoading={inviteCheckLoading}
            checkError={inviteCheckError}
            submitting={inviteSubmitting}
            error={inviteError}
            onCheckEmail={(e) => onCheckEmail?.(e)}
            onSubmit={(e) => onInviteSubmit?.(e)}
            onBack={() => resetInviteToStep1?.()}
            onCancel={resetInviteForm}
          />
        ) : (
          <div className="mb-6 flex flex-wrap gap-2">{addButton}</div>
        )
      ) : null}

      {!canInviteMore && parents.length >= maxParents ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Maximum number of parents reached.</p>
      ) : null}
    </SectionCard>
  );
}
