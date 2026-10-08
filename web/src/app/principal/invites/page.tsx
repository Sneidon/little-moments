'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { buildInviteAcceptDeepLink } from '@/config/inviteLinks';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InviteQrCodeDialog } from '@/components/InviteQrCodeDialog';
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
import { downloadPrincipalSchoolInviteHandoutPdf } from '@/lib/export/schoolInvitePdf';
import { InviteShareButtons, PrincipalInviteContext, type PrincipalInvite } from './PrincipalInviteParts';

const ROLES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
];

async function loadSchoolInvites(): Promise<PrincipalInvite[]> {
  const list = httpsCallable<Record<string, never>, { invites?: PrincipalInvite[] }>(getFunctions(app), 'listPrincipalSchoolInvites');
  const { data } = await list({});
  return Array.isArray(data.invites) ? data.invites : [];
}

export default function PrincipalInvitesPage() {
  const manager = useInvitesManager<PrincipalInvite>({
    load: useCallback(loadSchoolInvites, []),
    resendCallable: () => 'resendSchoolInvite',
    resendSuccess: 'Invitation email sent again. They will receive a link by email.',
    pdfError: 'Could not generate PDF. Try another browser or check that invites loaded correctly.',
  });
  const { invites, pendingDelete } = manager;
  const [filters, setFilters] = useState(EMPTY_INVITE_FILTERS);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const filtered = useMemo(
    () => filterInvites(invites, filters, (i) => [i.email, i.childName, i.inviteeDisplayName, i.schoolName, i.className]),
    [invites, filters]
  );

  const deleteMessage = !pendingDelete
    ? ''
    : inviteStatus(pendingDelete) === 'ACCEPTED'
      ? `Remove the invite record for ${pendingDelete.email}? Existing accounts stay as they are; this only clears the invitation record.`
      : `Delete the invite for ${pendingDelete.email}? The link will stop working for this invitation.`;

  return (
    <div className="animate-fade-in">
      <InviteQrCodeDialog open={!!qrUrl} onClose={() => setQrUrl(null)} inviteUrl={qrUrl ?? ''} />
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
        subtitle="Teacher and parent invites. Tap Share QR code so someone can scan and open the invite, or resend email and delete as needed."
      />
      {!manager.loading && invites.length > 0 && (
        <InviteFilters
          value={filters}
          onChange={setFilters}
          roles={ROLES}
          roleSelectWidth="min-w-[140px]"
          searchPlaceholder="Email, child, class…"
          shown={filtered.length}
          total={invites.length}
        />
      )}
      <InviteTotals totals={inviteTotals(invites)} />
      <InviteNotices error={manager.error} banner={manager.banner.message} onDismiss={manager.banner.dismiss} />

      <SectionCard topBar="accent" padding="none">
        {manager.loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[960px] w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {['Context', 'Invite email', 'Role', 'Created', 'Expires', 'Status'].map((h) => (
                    <th key={h} className={INVITE_TH}>
                      {h}
                    </th>
                  ))}
                  <th className={`${INVITE_TH} whitespace-nowrap`}>QR / PDF</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invite) => {
                  const status = inviteStatus(invite);
                  const busy = manager.isBusy(invite.id);
                  return (
                    <tr key={invite.id} className="border-t border-slate-100 dark:border-slate-600">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        <PrincipalInviteContext invite={invite} />
                      </td>
                      <td className={INVITE_TD}>{invite.email}</td>
                      <td className={`${INVITE_TD} uppercase`}>{invite.role}</td>
                      <InviteDateCells createdAt={invite.createdAt} expiresAt={invite.expiresAt} />
                      <td className="px-4 py-3">
                        <InviteStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <InviteShareButtons
                          accepted={status === 'ACCEPTED'}
                          disabled={busy}
                          generating={!!manager.generatingPdf[invite.id]}
                          onShowQr={() => {
                            manager.setError(null);
                            setQrUrl(buildInviteAcceptDeepLink(inviteToken(invite)));
                          }}
                          onDownloadPdf={() => void manager.downloadPdf(invite, downloadPrincipalSchoolInviteHandoutPdf)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {status !== 'ACCEPTED' ? (
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
            {invites.length === 0 && (
              <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                No teacher or parent invites yet. Invite staff from{' '}
                <Link href="/principal/staff" className="text-primary-600 underline dark:text-primary-400">
                  Staff
                </Link>{' '}
                or parents from a child’s profile.
              </p>
            )}
            {invites.length > 0 && filtered.length === 0 && <NoMatchingInvites onClear={() => setFilters(EMPTY_INVITE_FILTERS)} />}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
