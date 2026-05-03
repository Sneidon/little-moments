/**
 * Printable handouts for admin invite list rows — mirrors invite email messaging per role.
 * Teacher/parent reuse `exportPrincipalSchoolInvitePdf`; principal & super_admin are local.
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
import { downloadPrincipalSchoolInviteHandoutPdf } from '@/lib/exportPrincipalSchoolInvitePdf';

export type AdminInvitePdfRow = {
  id: string;
  token?: string;
  email: string;
  role: 'principal' | 'teacher' | 'parent' | 'super_admin';
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

async function downloadPrincipalOrSuperAdminHandout(invite: AdminInvitePdfRow): Promise<void> {
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
  const greeting = invite.inviteeDisplayName?.trim() || 'there';
  const expiryStr = formatExpiryLocal(invite.expiresAt);

  const isSuper = invite.role === 'super_admin';
  const headline = isSuper ? 'Welcome, Administrator!' : 'Welcome to My Little Moments';
  const meta = isSuper
    ? `Super admin invitation · ${invite.email} · Expires ${expiryStr}`
    : `Principal invitation · ${invite.email} · Expires ${expiryStr}`;
  const subtitle = isSuper ? `Join ${PDF_BRAND} as a super administrator` : `Lead your school on ${PDF_BRAND}`;

  const school = invite.schoolName?.trim() || 'your school';
  let body: string;
  let bullets: string[];

  if (isSuper) {
    body = `You've been invited to join ${PDF_BRAND} as a super administrator. Accept below to choose your password — then pick up invitations, schools and support right from your console.`;
    bullets = [
      'Open the Admin console — manage invitations, principals and visibility across schools from one place.',
      'Invite schools — send onboarding links so each principal can activate their school workspace.',
    ];
  } else {
    body = `${PDF_BRAND} has invited you to lead ${school} on ${PDF_BRAND} — you're just a few clicks away from connecting your team and parents.`;
    bullets = [
      'Complete your profile — after you accept, add school details so your dashboard is ready from day one.',
      'Invite your teachers and parents — share secure invites so staff and families can join without sharing passwords.',
    ];
  }

  let y = pdfAddHeader(doc, {
    title: headline,
    subtitle,
    meta,
    margin,
    schoolName: isSuper ? undefined : invite.schoolName,
  });

  y += 2;
  y = addWrapped(doc, `Hi ${greeting},`, margin, y, bodyW, 5.2) + 2;
  y = addWrapped(doc, body, margin, y, bodyW, 5.2) + 4;

  y = pdfAddSectionTitle(doc, 'What to do next', margin, y);
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

  pdfAddFooter(doc, margin, pageH, 'Invite handout', { schoolName: isSuper ? undefined : invite.schoolName });

  const fname = `invite-${invite.role}-${sanitizeFilePart(invite.email)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}

export async function downloadAdminInviteHandoutPdf(invite: AdminInvitePdfRow): Promise<void> {
  if (invite.role === 'teacher' || invite.role === 'parent') {
    await downloadPrincipalSchoolInviteHandoutPdf({
      id: invite.id,
      token: invite.token,
      email: invite.email,
      role: invite.role,
      schoolName: invite.schoolName,
      principalName: invite.principalName,
      className: invite.className,
      childName: invite.childName,
      inviteeDisplayName: invite.inviteeDisplayName,
      expiresAt: invite.expiresAt,
    });
    return;
  }
  await downloadPrincipalOrSuperAdminHandout(invite);
}
