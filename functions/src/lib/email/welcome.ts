import { invitePostAcceptEmailCard } from './cards';
import { escapeHtml, inviteEmailAppUrl, inviteEmailDividerRow, inviteEmailFeatureRow, inviteEmailMobileAppStoreRow } from './layout';
import { sendResendEmail } from './send';

function parentPostAcceptWelcomeEmailHtml(params: {
  firstName: string;
  schoolName: string;
  childName: string;
  dashboardUrl: string;
}): string {
  const { firstName, schoolName, childName, dashboardUrl } = params;
  const headline = `Welcome, ${escapeHtml(firstName)}!`;
  const body =
    `You&apos;re now connected to <strong>${escapeHtml(schoolName)}</strong> on My Little Moments. From here you&apos;ll get photos, milestones and daily updates about <strong>${escapeHtml(
      childName
    )}</strong> &mdash; straight from their teachers.`;
  const features =
    inviteEmailFeatureRow({
      icon: '📱',
      title: "1. Add your child's details",
      description:
        'Complete the profile with allergies, medical info and emergency contacts so teachers have everything they need to keep your little one safe.',
      linkUrl: inviteEmailAppUrl('/login'),
      linkLabel: 'Add my child →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailMobileAppStoreRow({
      title: '2. Download the mobile app',
      description:
        'Get instant photos, updates and reminders on your phone — so you can be part of the day, even when you are at work.',
      iconOnRight: false,
    });
  return invitePostAcceptEmailCard({
    headline,
    bodyHtml: body,
    dashboardUrl,
    featuresInnerHtml: features,
  });
}

export async function sendParentPostAcceptWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  childName: string;
}): Promise<void> {
  const dashboardUrl = inviteEmailAppUrl('/login');
  await sendResendEmail({
    to: params.to.trim(),
    subject: `Welcome — you're connected on My Little Moments`,
    html: parentPostAcceptWelcomeEmailHtml({
      firstName: params.firstName.trim() || 'there',
      schoolName: params.schoolName.trim(),
      childName: params.childName.trim(),
      dashboardUrl,
    }),
  });
}

function teacherPostAcceptWelcomeEmailHtml(params: {
  firstName: string;
  schoolName: string;
  className: string;
  dashboardUrl: string;
}): string {
  const { firstName, schoolName, className, dashboardUrl } = params;
  const headline = `You&apos;re all set, ${escapeHtml(firstName)}!`;
  const body =
    `Your teacher account at <strong>${escapeHtml(schoolName)}</strong> is ready to go for <strong>${escapeHtml(className)}</strong>. Here are a few quick steps to help you start sharing little moments with parents today.`;
  const login = inviteEmailAppUrl('/login');
  const features =
    inviteEmailFeatureRow({
      icon: '🏷️',
      title: '1. Complete your profile',
      description:
        'Add your photo, qualifications and a short intro so parents know who is caring for their child.',
      linkUrl: login,
      linkLabel: 'Go to profile →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '2. View your assigned class',
      description:
        'See your classroom roster, children&apos;s profiles and any important notes from parents.',
      linkUrl: login,
      linkLabel: 'View my class →',
      iconOnRight: false,
    }) +
    inviteEmailDividerRow() +
    inviteEmailFeatureRow({
      icon: '📱',
      title: '3. Learn daily check-ins',
      description:
        'Log meals, naps, nappies and activities in seconds — parents get instant updates throughout the day.',
      linkUrl: login,
      linkLabel: 'See how check-ins work →',
      iconOnRight: true,
    }) +
    inviteEmailDividerRow() +
    inviteEmailMobileAppStoreRow({
      title: '4. Download the mobile app',
      description:
        'Capture photos and log moments on the go — straight from your phone in the classroom or on the playground.',
      iconOnRight: false,
    });
  return invitePostAcceptEmailCard({
    headline,
    bodyHtml: body,
    dashboardUrl,
    featuresInnerHtml: features,
  });
}

export async function sendTeacherPostAcceptWelcomeEmail(params: {
  to: string;
  firstName: string;
  schoolName: string;
  className: string;
}): Promise<void> {
  const dashboardUrl = inviteEmailAppUrl('/login');
  await sendResendEmail({
    to: params.to.trim(),
    subject: `You're all set — your My Little Moments teacher account is ready`,
    html: teacherPostAcceptWelcomeEmailHtml({
      firstName: params.firstName.trim() || 'there',
      schoolName: params.schoolName.trim(),
      className: params.className.trim(),
      dashboardUrl,
    }),
  });
}
