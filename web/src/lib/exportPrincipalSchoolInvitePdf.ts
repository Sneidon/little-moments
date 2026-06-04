/**
 * Printable invitation handout (teacher / parent): mirrors invite email headline, body,
 * next-steps bullets, expiry, support line, QR + full URL.
 */
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { buildInviteAcceptDeepLink } from '@/config/inviteLinks';
import {
  PDF_BRAND,
  PDF_MARGIN,
  PDF_FONT,
  PDF_COLOR,
  pdfAddHeader,
  pdfAddSectionTitle,
  pdfAddFooter,
} from '@/lib/pdfDesign';

export type PrincipalSchoolInvitePdfRow = {
  id: string;
  token?: string;
  email: string;
  role: 'teacher' | 'parent';
  schoolName?: string;
  principalName?: string;
  className?: string;
  childName?: string;
  inviteeDisplayName?: string;
  expiresAt: string;
};

function bearerToken(row: { id: string; token?: string }): string {
  return row.token?.trim() || row.id;
}

function sanitizeFilePart(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'invite';
}

function formatExpiryLocal(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return new Date(iso).toLocaleString();
}

function addWrapped(
  doc: jsPDF,
  text: string,
  margin: number,
  y: number,
  maxWidth: number,
  lineHeightMm: number
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONT.bodySize);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    doc.text(line, margin, y);
    y += lineHeightMm;
  }
  return y;
}

export async function downloadPrincipalSchoolInviteHandoutPdf(
  invite: PrincipalSchoolInvitePdfRow
): Promise<void> {
  const inviteUrl = buildInviteAcceptDeepLink(bearerToken(invite));
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 320,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  const margin = PDF_MARGIN.portrait;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bodyW = pageW - margin * 2;

  const school = invite.schoolName?.trim() || 'your school';
  const greeting = invite.inviteeDisplayName?.trim() || 'there';
  const principalLabel = invite.principalName?.trim() || 'Your principal';
  const expiryStr = formatExpiryLocal(invite.expiresAt);

  const headline = invite.role === 'teacher' ? 'Welcome, Teacher!' : 'Welcome, Parent!';
  const meta =
    invite.role === 'teacher'
      ? `Teacher invitation · ${invite.email} · Expires ${expiryStr}`
      : `Parent invitation · ${invite.email} · Expires ${expiryStr}`;

  const subtitle =
    invite.role === 'teacher'
      ? `Join ${school} on ${PDF_BRAND}`
      : `${school} invites you on ${PDF_BRAND}`;

  let y = pdfAddHeader(doc, {
    title: headline,
    subtitle,
    meta,
    margin,
    schoolName: invite.schoolName,
  });

  y += 2;
  y = addWrapped(doc, `Hi ${greeting},`, margin, y, bodyW, 5.2) + 2;

  let body: string;
  if (invite.role === 'teacher') {
    const classPart = invite.className?.trim()
      ? ` as a teacher for ${invite.className.trim()}`
      : ' as a teacher';
    body = `${principalLabel} has invited you to join ${school}${classPart} on ${PDF_BRAND} — let's make every little moment count.`;
  } else {
    const child = invite.childName?.trim() || 'your child';
    body = `${principalLabel} has invited you to join ${school} on ${PDF_BRAND} — so you never miss a moment of ${child}'s day.`;
  }

  y = addWrapped(doc, body, margin, y, bodyW, 5.2) + 4;

  y = pdfAddSectionTitle(doc, 'What to do next', margin, y);
  const bullets =
    invite.role === 'teacher'
      ? [
          `Accept using the QR code below or your email link, then choose your password.`,
          'Complete your profile — add your photo and a short introduction so families know who cares for their little ones.',
          'After you accept, open the My Little Moments mobile app — your classroom and roster are there.',
        ]
      : [
          'Scan the QR code below (or open the invite link from email) and choose your password.',
          "Complete your child's details — allergies, medical info and emergency contacts for teachers.",
          'Install the mobile app — photos and updates are best on your phone.',
        ];

  doc.setFontSize(Math.max(PDF_FONT.bodySize - 1, 9));
  for (const b of bullets) {
    const lines = doc.splitTextToSize(`• ${b}`, bodyW - 6);
    for (const line of lines) {
      doc.text(line, margin + 3, y);
      y += 4.3;
    }
    y += 1;
  }

  doc.setFontSize(PDF_FONT.bodySize);
  y += 3;
  y = pdfAddSectionTitle(doc, 'Scan to accept this invite', margin, y);
  const qrMm = 48;
  doc.addImage(qrDataUrl, 'PNG', margin, y, qrMm, qrMm);
  y += qrMm + 4;

  doc.setFontSize(PDF_FONT.metaSize);
  doc.setTextColor(...PDF_COLOR.meta);
  const linkLead = 'If you cannot scan, open this link in a browser:';
  for (const line of doc.splitTextToSize(linkLead, bodyW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 1;
  for (const line of doc.splitTextToSize(inviteUrl, bodyW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 4;
  doc.setTextColor(0, 0, 0);
  for (const line of doc.splitTextToSize(`Link expires ${expiryStr}.`, bodyW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 3;
  for (const line of doc.splitTextToSize(
    'Questions? Reply to your invite email or reach us at info@mylittlemoments.co.za',
    bodyW
  )) {
    doc.text(line, margin, y);
    y += 4;
  }

  pdfAddFooter(doc, margin, pageH, 'Invite handout', { schoolName: invite.schoolName });

  const fname = `invite-${invite.role}-${sanitizeFilePart(invite.email)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}
