export type InviteStatus = 'ACCEPTED' | 'EXPIRED' | 'PENDING';

export type InviteBase = {
  id: string;
  token?: string;
  email: string;
  role: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

export function inviteStatus(invite: InviteBase): InviteStatus {
  if (invite.usedAt) return 'ACCEPTED';
  const expiry = new Date(invite.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry < Date.now() ? 'EXPIRED' : 'PENDING';
}

export function inviteToken(invite: { id: string; token?: string }): string {
  return invite.token?.trim() || invite.id;
}

export type InviteFilterState = { status: 'all' | InviteStatus; role: string; search: string };

export const EMPTY_INVITE_FILTERS: InviteFilterState = { status: 'all', role: 'all', search: '' };

export function hasInviteFilters(f: InviteFilterState): boolean {
  return f.status !== 'all' || f.role !== 'all' || f.search.trim().length > 0;
}

export function filterInvites<T extends InviteBase>(invites: T[], f: InviteFilterState, searchFields: (invite: T) => (string | undefined)[]): T[] {
  const q = f.search.trim().toLowerCase();
  return invites.filter((invite) => {
    if (f.status !== 'all' && inviteStatus(invite) !== f.status) return false;
    if (f.role !== 'all' && invite.role !== f.role) return false;
    return !q || searchFields(invite).filter(Boolean).join(' ').toLowerCase().includes(q);
  });
}

export function inviteTotals(invites: InviteBase[]) {
  const count = (status: InviteStatus) => invites.filter((i) => inviteStatus(i) === status).length;
  return { total: invites.length, pending: count('PENDING'), accepted: count('ACCEPTED'), expired: count('EXPIRED') };
}
