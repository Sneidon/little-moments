import { INVITE_EMAIL_BTN_L, INVITE_EMAIL_BTN_R, INVITE_EMAIL_FONT_MONO, INVITE_EMAIL_FONT_SANS, INVITE_EMAIL_PURPLE, emailBrandLogoSrcAttr, escapeHtml, inviteEmailBannerSrcAttr, inviteEmailEscapeHref, inviteEmailWrapDocument } from './layout';

function inviteEmailHeroRow(): string {
  const bannerSrc = inviteEmailBannerSrcAttr();
  return `
  <tr>
    <td style="padding:0 24px 20px;line-height:0;">
      <div style="border-radius:16px;overflow:hidden;line-height:0;">
        <img src="${bannerSrc}" alt="" width="472" height="236" style="display:block;width:100%;max-width:472px;height:auto;border:0;" />
      </div>
    </td>
  </tr>`;
}

function inviteEmailBrandHeaderRow(): string {
  const src = emailBrandLogoSrcAttr();
  return `
  <tr>
    <td align="center" style="padding:28px 24px 16px;line-height:0;">
      <img src="${src}" alt="" width="32" height="32" style="display:inline-block;width:32px;height:32px;border:0;border-radius:4px;vertical-align:middle;margin-right:10px;line-height:0;" />
      <span style="display:inline-block;font-family:${INVITE_EMAIL_FONT_MONO};font-size:17px;font-weight:700;color:${INVITE_EMAIL_PURPLE};vertical-align:middle;line-height:normal;">My Little Moments</span>
    </td>
  </tr>`;
}

function inviteEmailCtaAndExpiryRows(acceptUrl: string, expiresInDays: number): string {
  const href = inviteEmailEscapeHref(acceptUrl);
  const cta = `<a href="${href}" target="_blank" rel="noopener noreferrer"` +
    ` style="display:inline-block;padding:16px 38px;border-radius:999px;font-family:${INVITE_EMAIL_FONT_MONO};` +
    `font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;background:${INVITE_EMAIL_BTN_L};background:linear-gradient(90deg,${INVITE_EMAIL_BTN_L} 0%,${INVITE_EMAIL_BTN_R} 100%);">` +
    `Accept invite &amp; get started</a>`;
  return `
  <tr><td align="center" style="padding:8px 24px 6px;">${cta}</td></tr>
  <tr><td style="padding:0 24px 22px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:12px;color:#64748b;">
    This link expires in ${expiresInDays} days.
  </td></tr>
  <tr><td style="padding:0 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>`;
}

/** Post-invite welcome: same gradient CTA as invites, no expiry line. */
function inviteEmailDashboardCtaRows(dashboardUrl: string): string {
  const href = inviteEmailEscapeHref(dashboardUrl);
  const cta = `<a href="${href}" target="_blank" rel="noopener noreferrer"` +
    ` style="display:inline-block;padding:16px 38px;border-radius:999px;font-family:${INVITE_EMAIL_FONT_MONO};` +
    `font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;background:${INVITE_EMAIL_BTN_L};background:linear-gradient(90deg,${INVITE_EMAIL_BTN_L} 0%,${INVITE_EMAIL_BTN_R} 100%);">` +
    `Open your dashboard</a>`;
  return `
  <tr><td align="center" style="padding:8px 24px 6px;">${cta}</td></tr>
  <tr><td style="padding:0 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>`;
}

function inviteEmailSupportFooterRows(): string {
  const year = new Date().getUTCFullYear();
  return `
  <tr><td style="padding:16px 24px 0;"><div style="height:1px;background:#e2e8ef;"></div></td></tr>
  <tr>
    <td style="padding:20px 24px 12px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:13px;line-height:1.55;color:#64748b;">
      Need a hand? Reply to this email or reach us at
      <a href="mailto:info@mylittlemoments.co.za" style="color:${INVITE_EMAIL_PURPLE};font-family:${INVITE_EMAIL_FONT_MONO};text-decoration:none;">info@mylittlemoments.co.za</a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 32px;text-align:center;font-family:${INVITE_EMAIL_FONT_SANS};font-size:11px;line-height:1.5;color:#94a3b8;">
      &copy; ${year} My Little Moments &mdash; Caring for South Africa&apos;s little moments
    </td>
  </tr>`;
}

export function inviteEmailCard(params: {
  headline: string;
  greetingName: string;
  bodyHtml: string;
  acceptUrl: string;
  expiresInDays: number;
  featuresInnerHtml: string;
}): string {
  const outer = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#fafafa;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,0.07);">
        ${inviteEmailBrandHeaderRow()}
        ${inviteEmailHeroRow()}
        <tr>
          <td align="center" style="padding:8px 24px 12px;font-family:${INVITE_EMAIL_FONT_MONO};font-size:22px;line-height:1.25;font-weight:700;color:#1e1b4b;">
            ${escapeHtml(params.headline)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 4px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;color:#334155;">
            Hi ${escapeHtml(params.greetingName)},
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 12px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;line-height:1.62;color:#334155;">
            ${params.bodyHtml}
          </td>
        </tr>
        ${inviteEmailCtaAndExpiryRows(params.acceptUrl, params.expiresInDays)}
        <tr>
          <td style="padding:12px 24px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${params.featuresInnerHtml}
            </table>
          </td>
        </tr>
        ${inviteEmailSupportFooterRows()}
      </table>
    </td>
  </tr>
</table>`;
  return inviteEmailWrapDocument(outer);
}

/** Same shell as invite emails: no &quot;Hi …,&quot; row; dashboard CTA without expiry. `headline` must be HTML-safe. */
export function invitePostAcceptEmailCard(params: {
  headline: string;
  bodyHtml: string;
  dashboardUrl: string;
  featuresInnerHtml: string;
}): string {
  const outer = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#fafafa;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="border-collapse:collapse;max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,0.07);">
        ${inviteEmailBrandHeaderRow()}
        ${inviteEmailHeroRow()}
        <tr>
          <td align="center" style="padding:8px 24px 12px;font-family:${INVITE_EMAIL_FONT_MONO};font-size:22px;line-height:1.25;font-weight:700;color:#1e1b4b;">
            ${params.headline}
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 12px;font-family:${INVITE_EMAIL_FONT_SANS};font-size:15px;line-height:1.62;color:#334155;">
            ${params.bodyHtml}
          </td>
        </tr>
        ${inviteEmailDashboardCtaRows(params.dashboardUrl)}
        <tr>
          <td style="padding:12px 24px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${params.featuresInnerHtml}
            </table>
          </td>
        </tr>
        ${inviteEmailSupportFooterRows()}
      </table>
    </td>
  </tr>
</table>`;
  return inviteEmailWrapDocument(outer);
}
