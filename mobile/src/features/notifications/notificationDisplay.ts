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

export { groupByDay } from '../../utils/groupByDay';
