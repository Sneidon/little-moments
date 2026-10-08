import { INVITE_ACCEPT_APP_BASE_URL } from '../config';
import { inviteEmailCard } from './cards';
import { escapeHtml, inviteEmailAppUrl, inviteEmailDividerRow, inviteEmailFeatureRow, inviteEmailMobileAppStoreRow } from './layout';
import { sendResendEmail } from './send';

function principalWelcomeEmailHtml(params: {
  schoolName: string;
  principalName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, principalName, acceptUrl, expiresInDays } = params;
  const body = `My Little Moments has invited you to lead <strong>${escapeHtml(schoolName)}</strong> on My Little Moments — you&apos;re just a few clicks away from connecting your team and parents.`;
  const features =
    inviteEmailFeatureRow({
      icon: '🏷️',
      title: 'Complete your profile',
      description: 'After you accept, add school details so your dashboard is ready from day one.',
      linkUrl: inviteEmailAppUrl('/principal/profile'),
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '👥',
      title: 'Invite your teachers & parents',
      description: 'Share secure invites so staff and families can hop on — without sharing passwords.',
      linkUrl: inviteEmailAppUrl('/principal/staff'),
      linkLabel: 'Invite your team →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome to My Little Moments',
    greetingName: principalName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

export async function sendPrincipalInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  token: string;
  /** When true, copy is for joining an existing school as an additional admin. */
  existingSchool?: boolean;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  const schoolName = params.schoolName.trim();
  const greeting = (params.principalName && params.principalName.trim()) ? params.principalName.trim() : 'there';
  const subject = params.existingSchool
    ? `You're invited as a school admin at ${schoolName} on My Little Moments`
    : `You're invited to set up ${schoolName} on My Little Moments`;
  await sendResendEmail({
    to: params.to.trim(),
    subject,
    html: principalWelcomeEmailHtml({
      schoolName,
      principalName: greeting,
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

function superAdminInviteEmailHtml(params: {
  inviteeName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { inviteeName, acceptUrl, expiresInDays } = params;
  const body = `You&apos;ve been invited to join My Little Moments as a <strong>super administrator</strong>. Accept below to choose your password — then pick up invitations, schools and support right from your console.`;
  const features =
    inviteEmailFeatureRow({
      icon: '🛡️',
      title: 'Open the Admin console',
      description: 'Manage invitations, principals and visibility across schools from one place.',
      linkUrl: inviteEmailAppUrl('/admin'),
      linkLabel: 'Go to Admin →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '🏫',
      title: 'Invite schools',
      description: 'Send onboarding links so each principal can activate their school workspace.',
      linkUrl: inviteEmailAppUrl('/admin/schools'),
      linkLabel: 'View schools →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Administrator!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

export async function sendSuperAdminInviteEmail(params: {
  to: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're invited as a My Little Moments administrator`,
    html: superAdminInviteEmailHtml({
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

function teacherInviteEmailHtml(params: {
  schoolName: string;
  inviteeName: string;
  principalName: string;
  className?: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, inviteeName, principalName, className, acceptUrl, expiresInDays } = params;
  const classPhrase = className
    ? ` as a teacher for <strong>${escapeHtml(className)}</strong>`
    : ' as a teacher';
  const body =
    `<strong>${escapeHtml(principalName)}</strong> has invited you to join <strong>${escapeHtml(schoolName)}</strong>${classPhrase}` +
    ` on My Little Moments — let&apos;s make every little moment count.`;
  const features =
    inviteEmailFeatureRow({
      icon: '👋',
      title: 'Complete your profile',
      description: 'Add your photo and a short introduction so families know who is caring for their little ones.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📋',
      title: 'Meet your class',
      description: 'Open the mobile app after you accept — your assigned class and roster are ready there.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'View my class →',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Teacher!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

export async function sendTeacherInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  className?: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  const principalLabel =
    params.principalName && params.principalName.trim() ? params.principalName.trim() : 'Your principal';
  await sendResendEmail({
    to: params.to.trim(),
    subject: `${params.schoolName.trim()} invited you as a teacher on My Little Moments`,
    html: teacherInviteEmailHtml({
      schoolName: params.schoolName.trim(),
      principalName: principalLabel,
      ...(params.className && params.className.trim() ? { className: params.className.trim() } : {}),
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}

function parentInviteEmailHtml(params: {
  schoolName: string;
  principalName: string;
  childName: string;
  inviteeName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const { schoolName, principalName, childName, inviteeName, acceptUrl, expiresInDays } = params;
  const body =
    `<strong>${escapeHtml(principalName)}</strong> has invited you to join <strong>${escapeHtml(schoolName)}</strong> on My Little Moments — so you never miss a moment of <strong>${escapeHtml(
      childName
    )}</strong>&apos;s day.`;
  const features =
    inviteEmailFeatureRow({
      icon: '📝',
      title: "Add your child's details",
      description: 'After you accept, complete allergies, medical info and contacts so teachers have exactly what they need.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Add my child →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailMobileAppStoreRow({
      description:
        'Photos, routines and reminders feel best on your phone — jump in once your account is linked.',
      iconOnRight: false,
    });
  return inviteEmailCard({
    headline: 'Welcome, Parent!',
    greetingName: inviteeName,
    bodyHtml: body,
    acceptUrl,
    expiresInDays,
    featuresInnerHtml: features,
  });
}

export async function sendParentInviteEmail(params: {
  to: string;
  schoolName: string;
  principalName?: string;
  childName: string;
  inviteeName?: string;
  token: string;
}): Promise<void> {
  const acceptUrl = `${INVITE_ACCEPT_APP_BASE_URL}/invite/accept?token=${encodeURIComponent(params.token)}`;
  const principalLabel =
    params.principalName && params.principalName.trim() ? params.principalName.trim() : 'Your principal';
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're invited to follow ${params.childName.trim()} on My Little Moments`,
    html: parentInviteEmailHtml({
      schoolName: params.schoolName.trim(),
      principalName: principalLabel,
      childName: params.childName.trim(),
      inviteeName: (params.inviteeName && params.inviteeName.trim()) ? params.inviteeName.trim() : 'there',
      acceptUrl,
      expiresInDays: 7,
    }),
  });
}
