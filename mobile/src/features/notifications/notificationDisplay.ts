import type { Ionicons } from '@expo/vector-icons';
import { updateTypeStyle } from '../../theme/category';

export type NotificationItem = {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  schoolId?: string;
  childId?: string;
  reportId?: string;
  announcementId?: string;
  eventId?: string;
  reportType?: string;
  chatId?: string;
  classId?: string;
  createdAt?: string;
  read?: boolean;
};

type CategoryKey = ReturnType<typeof updateTypeStyle>['category'];
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_STYLES: Record<string, { icon: IconName; category: CategoryKey }> = {
  chat_message: { icon: 'chatbubble-ellipses-outline', category: 'nap' },
  announcement: { icon: 'megaphone-outline', category: 'activity' },
  announcement_reminder: { icon: 'megaphone-outline', category: 'activity' },
  event_reminder: { icon: 'calendar-outline', category: 'checkOut' },
  daily_communication: { icon: 'sunny-outline', category: 'meal' },
  class_assigned: { icon: 'school-outline', category: 'attendance' },
  class_change: { icon: 'school-outline', category: 'attendance' },
  child_joined_class: { icon: 'person-add-outline', category: 'attendance' },
  pending_registration: { icon: 'person-add-outline', category: 'media' },
  registration_approved: { icon: 'person-add-outline', category: 'media' },
};

export function notificationStyle(item: NotificationItem): { icon: IconName; category: CategoryKey } {
  if (item.type === 'daily_report' && item.reportType) return updateTypeStyle(item.reportType);
  return TYPE_STYLES[item.type ?? ''] ?? { icon: 'notifications-outline', category: 'nappy' };
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function dayTitle(iso: string | undefined): string {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export type NotificationSection = { title: string; data: NotificationItem[] };

export function groupByDay(items: NotificationItem[]): NotificationSection[] {
  const sections: NotificationSection[] = [];
  for (const item of items) {
    const title = dayTitle(item.createdAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}
