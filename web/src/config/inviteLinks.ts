/** Same origin as Functions invite emails (`INVITE_ACCEPT_APP_BASE_URL`). */
export const INVITE_ACCEPT_PUBLIC_BASE_URL =
  'https://littlemoments--little-moments-6647f.us-central1.hosted.app';

export function buildInviteAcceptDeepLink(token: string): string {
  const t = (token || '').trim();
  if (!t) return `${INVITE_ACCEPT_PUBLIC_BASE_URL}/invite/accept`;
  return `${INVITE_ACCEPT_PUBLIC_BASE_URL}/invite/accept?token=${encodeURIComponent(t)}`;
}
