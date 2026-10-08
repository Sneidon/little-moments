import { EMAIL_BRAND_LOGO_URL, EMAIL_INVITE_BANNER_URL, INVITE_ACCEPT_APP_BASE_URL, MOBILE_APP_IOS_APP_STORE_URL, MOBILE_APP_PLAY_STORE_URL } from '../config';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function emailBrandLogoSrcAttr(): string {
  return EMAIL_BRAND_LOGO_URL.replace(/&/g, '&amp;');
}

export function inviteEmailBannerSrcAttr(): string {
  return EMAIL_INVITE_BANNER_URL.replace(/&/g, '&amp;');
}

export function inviteEmailEscapeHref(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function inviteEmailAppUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${INVITE_ACCEPT_APP_BASE_URL}${p}`;
}

export const INVITE_EMAIL_PURPLE = '#6A4BB1';

export const INVITE_EMAIL_BTN_L = '#7E3AF2';

export const INVITE_EMAIL_BTN_R = '#E05297';

export const INVITE_EMAIL_FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const INVITE_EMAIL_FONT_MONO = "'Courier New',Courier,ui-monospace,monospace";

/** Simple transactional HTML blocks (registration / approval) use this stack. */
export const TRANSACTIONAL_EMAIL_UI_FONT =
  'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';

export function transactionalEmailLogoTop(): string {
  const src = emailBrandLogoSrcAttr();
  return `<div style="margin:0 0 20px;text-align:center;line-height:0;">
    <img src="${src}" alt="" width="32" height="32" style="display:inline-block;width:32px;height:32px;margin:0 10px 0 0;border:0;border-radius:4px;vertical-align:middle;line-height:0;" />
    <span style="font-family:${INVITE_EMAIL_FONT_MONO};font-size:17px;font-weight:700;color:${INVITE_EMAIL_PURPLE};vertical-align:middle;line-height:normal;">My Little Moments</span>
  </div>`;
}

export function inviteEmailWrapDocument(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#fafafa;">
${inner}
</body>
</html>`;
}

export function inviteEmailFeatureRow(params: {
  icon: string;
  title: string;
  description: string;
  linkUrl: string;
  linkLabel: string;
  iconOnRight: boolean;
}): string {
  const iconInner = `<div style="width:48px;height:48px;border-radius:12px;background:#f3e8ff;text-align:center;line-height:48px;font-size:20px;">${params.icon}</div>`;
  const iconTd = `<td valign="top" width="56" style="width:56px;padding:20px 0 0;">${iconInner}</td>`;
  const textTd = `<td valign="top" style="padding:20px 0 0;font-family:${INVITE_EMAIL_FONT_SANS};">` +
    `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e293b;">${escapeHtml(params.title)}</p>` +
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#475569;">${escapeHtml(params.description)}</p>` +
    `<a href="${inviteEmailEscapeHref(params.linkUrl)}" target="_blank" rel="noopener noreferrer"` +
    ` style="font-family:${INVITE_EMAIL_FONT_MONO};font-size:13px;font-weight:600;color:${INVITE_EMAIL_PURPLE};text-decoration:none;">${escapeHtml(
      params.linkLabel
    )}</a></td>`;
  const cells = params.iconOnRight ? `${textTd}${iconTd}` : `${iconTd}${textTd}`;
  return `<tr>${cells}</tr>`;
}

export function inviteEmailDividerRow(): string {
  return `<tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#e2e8ef;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`;
}

export function inviteEmailMobileAppStoreRow(opts?: {
  title?: string;
  description?: string;
  iconOnRight?: boolean;
}): string {
  const iconInner =
    '<div style="width:48px;height:48px;border-radius:12px;background:#f3e8ff;text-align:center;line-height:48px;font-size:20px;">📱</div>';
  const iconTd = `<td valign="top" width="56" style="width:56px;padding:20px 0 0;">${iconInner}</td>`;
  const iosHref = inviteEmailEscapeHref(MOBILE_APP_IOS_APP_STORE_URL);
  const playHref = inviteEmailEscapeHref(MOBILE_APP_PLAY_STORE_URL);
  const linkStyle = `font-family:${INVITE_EMAIL_FONT_MONO};font-size:13px;font-weight:600;color:${INVITE_EMAIL_PURPLE};text-decoration:none;`;
  const linksHtml =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
    '<tr>' +
    '<td style="padding:0 16px 0 0;vertical-align:middle;">' +
    `<a href="${iosHref}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">App Store →</a>` +
    '</td>' +
    '<td style="vertical-align:middle;">' +
    `<a href="${playHref}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">Google Play →</a>` +
    '</td>' +
    '</tr></table>';
  const title = opts?.title ?? 'Download the mobile app';
  const description =
    opts?.description ??
    'Install My Little Moments on your phone for photos, updates and reminders throughout the day.';
  const textTd =
    `<td valign="top" style="padding:20px 0 0;font-family:${INVITE_EMAIL_FONT_SANS};">` +
    `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e293b;">${escapeHtml(title)}</p>` +
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#475569;">${escapeHtml(description)}</p>` +
    linksHtml +
    '</td>';
  const cells = opts?.iconOnRight ? `${textTd}${iconTd}` : `${iconTd}${textTd}`;
  return `<tr>${cells}</tr>`;
}

export function inviteEmailHeadlineFirstName(params: {
  preferred?: string | null;
  displayFromForm: string | null;
  displayFromInvite?: string | null;
  fallbackDisplay: string;
}): string {
  const firstToken = (s: string | null | undefined): string | null => {
    if (!s || typeof s !== 'string') return null;
    const t = s.trim();
    if (!t) return null;
    const w = t.split(/\s+/)[0];
    return w || null;
  };
  return (
    firstToken(params.preferred) ??
    firstToken(params.displayFromForm) ??
    firstToken(params.displayFromInvite) ??
    firstToken(params.fallbackDisplay) ??
    'there'
  );
}
