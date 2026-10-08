import * as functions from 'firebase-functions';
import { RESEND_API_KEY_FALLBACK, RESEND_FROM_FALLBACK } from '../config';

export async function sendResendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = RESEND_API_KEY_FALLBACK;
  const from = RESEND_FROM_FALLBACK;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    functions.logger.error('Resend send failed', res.status, text);
    return;
  }
  functions.logger.info('Resend email sent', { to: params.to, subject: params.subject.slice(0, 120) });
}
