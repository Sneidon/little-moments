'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';
import { buildInviteAcceptDeepLink } from '@/config/inviteLinks';
import { InviteQrCodeDialog } from '@/components/InviteQrCodeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHero, SectionCard, TableSkeleton } from '@/components/ui';
import { downloadPrincipalSchoolInviteHandoutPdf } from '@/lib/exportPrincipalSchoolInvitePdf';

function principalInviteToken(row: { id: string; token?: string }): string {
  return row.token?.trim() || row.id;
}

type PrincipalSchoolInviteRow = {
  id: string;
  token?: string;
  email: string;
  role: 'teacher' | 'parent';
  schoolName?: string;
  /** Matches school principal display name — used for PDF / teacher email-style copy. */
  principalName?: string;
  className?: string;
  childId?: string;
  childName?: string;
  inviteeDisplayName?: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

function inviteStatus(invite: PrincipalSchoolInviteRow): 'ACCEPTED' | 'EXPIRED' | 'PENDING' {
  if (invite.usedAt) return 'ACCEPTED';
  const expiry = new Date(invite.expiresAt).getTime();
  if (Number.isFinite(expiry) && expiry < Date.now()) return 'EXPIRED';
  return 'PENDING';
}

export default function PrincipalInvitesPage() {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<PrincipalSchoolInviteRow[]>([]);
  const [resendingById, setResendingById] = useState<Record<string, boolean>>({});
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});
  const [pendingDeleteInvite, setPendingDeleteInvite] = useState<PrincipalSchoolInviteRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const [shareQrInviteUrl, setShareQrInviteUrl] = useState<string | null>(null);
  const [pdfGeneratingById, setPdfGeneratingById] = useState<Record<string, boolean>>({});

  const loadInvites = async () => {
    const listFn = httpsCallable<Record<string, never>, { invites?: PrincipalSchoolInviteRow[] }>(
      getFunctions(app),
      'listPrincipalSchoolInvites'
    );
    const { data } = await listFn({});
    setInvites(Array.isArray(data.invites) ? data.invites : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadInvites();
      } catch (err: unknown) {
        setError(
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Failed to load invitations'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const showBanner = (msg: string) => {
    setBanner(null);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    setBanner(msg);
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBanner(null);
      bannerTimeoutRef.current = null;
    }, 5000);
  };

  const resendInvite = async (inviteId: string) => {
    setError(null);
    setResendingById((prev) => ({ ...prev, [inviteId]: true }));
    try {
      const fn = httpsCallable<{ inviteId: string }, { ok: boolean }>(getFunctions(app), 'resendSchoolInvite');
      await fn({ inviteId });
      await loadInvites();
      showBanner('Invitation email sent again. They will receive a link by email.');
    } catch (err: unknown) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to resend invite'
      );
    } finally {
      setResendingById((prev) => ({ ...prev, [inviteId]: false }));
    }
  };

  const confirmDeleteInvite = async () => {
    if (!pendingDeleteInvite) return;
    const inviteId = pendingDeleteInvite.id;
    setPendingDeleteInvite(null);
    setError(null);
    setDeletingById((prev) => ({ ...prev, [inviteId]: true }));
    try {
      const fn = httpsCallable<{ inviteId: string }, { ok: boolean }>(getFunctions(app), 'deleteInviteToken');
      await fn({ inviteId });
      await loadInvites();
      showBanner('Invite deleted.');
    } catch (err: unknown) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to delete invite'
      );
    } finally {
      setDeletingById((prev) => ({ ...prev, [inviteId]: false }));
    }
  };

  const totals = useMemo(() => {
    const pending = invites.filter((i) => inviteStatus(i) === 'PENDING').length;
    const accepted = invites.filter((i) => inviteStatus(i) === 'ACCEPTED').length;
    const expired = invites.filter((i) => inviteStatus(i) === 'EXPIRED').length;
    return { pending, accepted, expired, total: invites.length };
  }, [invites]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'EXPIRED'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'parent'>('all');
  const [search, setSearch] = useState('');

  const filteredInvites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((invite) => {
      if (statusFilter !== 'all' && inviteStatus(invite) !== statusFilter) return false;
      if (roleFilter !== 'all' && invite.role !== roleFilter) return false;
      if (q) {
        const hay = [
          invite.email,
          invite.childName,
          invite.inviteeDisplayName,
          invite.schoolName,
          invite.className,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invites, statusFilter, roleFilter, search]);

  const hasInviteFilters =
    statusFilter !== 'all' || roleFilter !== 'all' || search.trim().length > 0;

  const clearInviteFilters = () => {
    setStatusFilter('all');
    setRoleFilter('all');
    setSearch('');
  };

  const deleteDialogMessage = pendingDeleteInvite
    ? inviteStatus(pendingDeleteInvite) === 'ACCEPTED'
      ? `Remove the invite record for ${pendingDeleteInvite.email}? Existing accounts stay as they are; this only clears the invitation record.`
      : `Delete the invite for ${pendingDeleteInvite.email}? The link will stop working for this invitation.`
    : '';

  return (
    <div className="animate-fade-in">
      <InviteQrCodeDialog
        open={!!shareQrInviteUrl}
        onClose={() => setShareQrInviteUrl(null)}
        inviteUrl={shareQrInviteUrl ?? ''}
      />
      <ConfirmDialog
        open={!!pendingDeleteInvite}
        onClose={() => setPendingDeleteInvite(null)}
        title="Delete invite?"
        message={deleteDialogMessage}
        confirmLabel="Delete invite"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteInvite}
        confirmDisabled={Boolean(pendingDeleteInvite && deletingById[pendingDeleteInvite.id])}
      />
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Invitations</span>}
        subtitle="Teacher and parent invites. Tap Share QR code so someone can scan and open the invite, or resend email and delete as needed."
      />

      {!loading && invites.length > 0 && (
        <SectionCard topBar="warm" padding="default" className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
            {hasInviteFilters && (
              <button
                type="button"
                onClick={clearInviteFilters}
                className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="input-base min-w-[160px]"
              >
                <option value="all">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="input-base min-w-[140px]"
              >
                <option value="all">All roles</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            </div>
            <div className="min-w-[min(100%,280px)] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Search</label>
              <input
                type="search"
                placeholder="Email, child, class…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base w-full max-w-md"
              />
            </div>
          </div>
          {hasInviteFilters && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredInvites.length} of {invites.length} invites
            </p>
          )}
        </SectionCard>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard topBar="primary" className="p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold">{totals.total}</p>
        </SectionCard>
        <SectionCard topBar="accent" className="p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-2xl font-bold">{totals.pending}</p>
        </SectionCard>
        <SectionCard topBar="warm" className="p-4">
          <p className="text-xs text-slate-500">Accepted</p>
          <p className="text-2xl font-bold">{totals.accepted}</p>
        </SectionCard>
        <SectionCard topBar="accent" className="p-4">
          <p className="text-xs text-slate-500">Expired</p>
          <p className="text-2xl font-bold">{totals.expired}</p>
        </SectionCard>
      </div>

      {error && (
        <SectionCard topBar="warm" className="mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </SectionCard>
      )}
      {banner && (
        <div
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
        >
          <span className="flex items-center justify-between gap-2">
            {banner}
            <button
              type="button"
              onClick={() => {
                if (bannerTimeoutRef.current) {
                  clearTimeout(bannerTimeoutRef.current);
                  bannerTimeoutRef.current = null;
                }
                setBanner(null);
              }}
              className="shrink-0 underline"
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <SectionCard topBar="accent" padding="none">
          <TableSkeleton rows={8} cols={8} />
        </SectionCard>
      ) : (
        <SectionCard topBar="accent" padding="none">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[960px] w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Context</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Invite email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    QR / PDF
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((invite) => {
                  const status = inviteStatus(invite);
                  return (
                    <tr key={invite.id} className="border-t border-slate-100 dark:border-slate-600">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {invite.role === 'teacher' ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            Staff ·{' '}
                            <Link href="/principal/staff" className="text-primary-600 hover:underline dark:text-primary-400">
                              roster
                            </Link>
                            {invite.schoolName ? (
                              <>
                                {' '}
                                · <span>{invite.schoolName}</span>
                              </>
                            ) : null}
                            {invite.inviteeDisplayName ? (
                              <>
                                {' '}
                                · <span className="text-slate-700 dark:text-slate-200">{invite.inviteeDisplayName}</span>
                              </>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">
                            Parent · {invite.childName || 'Child'}
                            {invite.childId ? (
                              <>
                                {' '}
                                (
                                <Link
                                  href={`/principal/children/${invite.childId}`}
                                  className="text-primary-600 hover:underline dark:text-primary-400"
                                >
                                  profile
                                </Link>
                                )
                              </>
                            ) : null}
                            {invite.inviteeDisplayName ? (
                              <>
                                {' '}
                                · <span className="text-slate-700 dark:text-slate-200">{invite.inviteeDisplayName}</span>
                              </>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{invite.email}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 uppercase">{invite.role}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(invite.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(invite.expiresAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'ACCEPTED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : status === 'EXPIRED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex min-w-[9.5rem] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setShareQrInviteUrl(
                                buildInviteAcceptDeepLink(principalInviteToken(invite))
                              );
                            }}
                            disabled={
                              status === 'ACCEPTED' ||
                              Boolean(resendingById[invite.id] || deletingById[invite.id])
                            }
                            title={
                              status === 'ACCEPTED'
                                ? 'This invite was already accepted'
                                : 'Show QR code for this invite link'
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-primary-300 bg-primary-100 px-3 py-2 text-xs font-bold text-primary-950 shadow-sm transition hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-45 dark:border-primary-600 dark:bg-primary-900/50 dark:text-primary-50 dark:hover:bg-primary-900/70"
                          >
                            Share QR code
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                setError(null);
                                setPdfGeneratingById((prev) => ({ ...prev, [invite.id]: true }));
                                try {
                                  await downloadPrincipalSchoolInviteHandoutPdf(invite);
                                  showBanner('PDF downloaded with invite details and QR.');
                                } catch {
                                  setError(
                                    'Could not generate PDF. Try another browser or check that invites loaded correctly.'
                                  );
                                } finally {
                                  setPdfGeneratingById((prev) => ({ ...prev, [invite.id]: false }));
                                }
                              })();
                            }}
                            disabled={
                              status === 'ACCEPTED' ||
                              Boolean(
                                pdfGeneratingById[invite.id] ||
                                  resendingById[invite.id] ||
                                  deletingById[invite.id]
                              )
                            }
                            title={
                              status === 'ACCEPTED'
                                ? 'This invite was already accepted'
                                : 'Download printable PDF (same messaging as email + QR)'
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            {pdfGeneratingById[invite.id] ? 'Generating…' : 'Download PDF'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {status !== 'ACCEPTED' ? (
                            <button
                              type="button"
                              onClick={() => resendInvite(invite.id)}
                              disabled={Boolean(resendingById[invite.id] || deletingById[invite.id])}
                              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              {resendingById[invite.id] ? 'Resending…' : 'Resend'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setPendingDeleteInvite(invite)}
                            disabled={Boolean(deletingById[invite.id] || resendingById[invite.id])}
                            className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {deletingById[invite.id] ? 'Deleting…' : 'Delete'}
                          </button>
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
            {invites.length > 0 && filteredInvites.length === 0 && (
              <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                No invites match your filters.{' '}
                <button type="button" onClick={clearInviteFilters} className="font-medium text-primary-600 underline dark:text-primary-400">
                  Clear filters
                </button>
              </p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
