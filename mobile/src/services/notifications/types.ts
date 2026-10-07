export type NotificationData = {
  type?: string;
  schoolId?: string;
  childId?: string;
  reportId?: string;
  announcementId?: string;
  eventId?: string;
  reportType?: string;
  chatId?: string;
  classId?: string;
  [key: string]: string | undefined;
};

export type RemoteMessage = {
  notification?: { title?: string; body?: string };
  data?: NotificationData;
};

export type ForegroundBannerPayload = {
  title: string;
  body?: string;
  data?: NotificationData;
};

export const NOTIFICATION_DATA_TYPES = {
  daily_communication: 'daily_communication',
  daily_report: 'daily_report',
  announcement: 'announcement',
  announcement_reminder: 'announcement_reminder',
  event_reminder: 'event_reminder',
  chat_message: 'chat_message',
  class_assigned: 'class_assigned',
  child_joined_class: 'child_joined_class',
} as const;
