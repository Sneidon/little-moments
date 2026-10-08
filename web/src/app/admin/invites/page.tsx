'use client';

import { useCallback, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InviteLinkShareControls } from '@/components/InviteLinkShareControls';
import {
  DeleteButton,
  EMPTY_INVITE_FILTERS,
  INVITE_TD,
  INVITE_TH,
  InviteDateCells,
  InviteFilters,
  InviteNotices,
  InviteStatusBadge,
  InviteTotals,
  NoMatchingInvites,
  ResendButton,
  filterInvites,
  inviteStatus,
  inviteToken,
  inviteTotals,
  useInvitesManager,
} from '@/components/invites';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';
import { downloadAdminInviteHandoutPdf } from '@/lib/export/adminInvitePdf';
import { AdminInviteContext } from './AdminInviteContext';
import type { AdminInvite } from './types';

const ROLES = [
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'super_admin', label: 'Super admin' },
];

const RESEND_CALLABLE: Record<AdminInvite['role'], string> = {
  super_admin: 'resendSuperAdminInvite',
  principal: 'resendPrincipalInvite',
  teacher: 'resendSchoolInvite',
  parent: 'resendSchoolInvite',
};

const timestamp = (iso: string) => {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

async function loadAllInvites(): Promise<AdminInvite[]> {
  const snap = await getDocs(collection(db, 'inviteTokens'));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<AdminInvite, 'id'>) }))
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
}

const PDF_BUTTON =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

export default function AdminInvitesPage() {
  const manager = useInvitesManager<AdminInvite>({
    load: useCallback(loadAllInvites, []),
    resendCallable: (invite) => RESEND_CALLABLE[invite.role] ?? 'resendPrincipalInvite',
    resendSuccess: 'Invitation email sent again. They will receive a new link.',
    pdfError: 'Could not generate PDF. Try another browser or check that the invite loaded correctly.',
  });
  const { invites, pendingDelete } = manager;
  const [filters, setFilters] = useState(EMPTY_INVITE_FILTERS);
  const filtered = useMemo(
    () => filterInvites(invites, filters, (i) => [i.email, i.schoolName, i.childName, i.inviteeDisplayName, i.principalName, i.className]),
    [invites, filters]
  );

  const deleteMessage = !pendingDelete
    ? ''
    : inviteStatus(pendingDelete) === 'ACCEPTED'
      ? `Remove the invite record for ${pendingDelete.email}? The school and user accounts are unchanged; this only deletes the stored invite.`
      : `Delete the invite for ${pendingDelete.email}? The link will stop working and no new acceptance is possible with this token.`;

  return (
    <div className="animate-fade-in">
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => manager.setPendingDelete(null)}
        title="Delete invite?"
        message={deleteMessage}
        confirmLabel="Delete invite"
        cancelLabel="Cancel"
        onConfirm={manager.confirmDelete}
        confirmDisabled={Boolean(pendingDelete && manager.deleting[pendingDelete.id])}
      />
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Invitations</span>}
        subtitle="Principal, teacher, parent, and super admin invites. QR code or printable PDF for pending invites, resend email, or delete."
      />
      {!manager.loading && invites.length > 0 && (
        <InviteFilters
          value={filters}
          onChange={setFilters}
          roles={ROLES}
          roleSelectWidth="min-w-[180px]"
          searchPlaceholder="Email, school, child…"
          shown={filtered.length}
          total={invites.length}
        />
      )}
      <InviteTotals totals={inviteTotals(invites)} />
      <InviteNotices error={manager.error} banner={manager.banner.message} onDismiss={manager.banner.dismiss} />

      <SectionCard topBar="accent" padding="none">
        {manager.loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <div className="overflow-hidden">
            <table className="data-table">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {['School / context', 'Invite email', 'Role', 'Created', 'Expires', 'Status'].map((h) => (
                    <th key={h} className={INVITE_TH}>
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invite) => {
                  const status = inviteStatus(invite);
                  const busy = manager.isBusy(invite.id);
                  const open = status !== 'ACCEPTED';
                  return (
                    <tr key={invite.id} className="border-t border-slate-100 dark:border-slate-600">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        <AdminInviteContext invite={invite} />
                      </td>
                      <td className={INVITE_TD}>{invite.email}</td>
                      <td className={`${INVITE_TD} uppercase`}>{invite.role}</td>
                      <InviteDateCells createdAt={invite.createdAt} expiresAt={invite.expiresAt} />
                      <td className="px-4 py-3">
                        <InviteStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {open ? <InviteLinkShareControls inviteToken={inviteToken(invite)} hideCopyLink disabled={busy} /> : null}
                          {open ? (
                            <button
                              type="button"
                              onClick={() => void manager.downloadPdf(invite, downloadAdminInviteHandoutPdf)}
                              disabled={busy || Boolean(manager.generatingPdf[invite.id])}
                              title="Download printable PDF (same messaging as email + QR)"
                              className={PDF_BUTTON}
                            >
                              {manager.generatingPdf[invite.id] ? 'Generating…' : 'Download PDF'}
                            </button>
                          ) : null}
                          {open ? (
                            <ResendButton onClick={() => void manager.resend(invite)} disabled={busy} busy={!!manager.resending[invite.id]} />
                          ) : null}
                          <DeleteButton onClick={() => manager.setPendingDelete(invite)} disabled={busy} busy={!!manager.deleting[invite.id]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invites.length === 0 && <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No invites yet.</p>}
            {invites.length > 0 && filtered.length === 0 && <NoMatchingInvites onClear={() => setFilters(EMPTY_INVITE_FILTERS)} />}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
