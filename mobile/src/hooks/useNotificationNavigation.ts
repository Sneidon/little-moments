/**
 * Subscribes to notification opened (tap) and navigates to the relevant screen.
 * Backend sends data.type: daily_communication | daily_report | announcement | announcement_reminder |
 * event_reminder | chat_message | class_assigned. Foreground FCM uses Expo local notifications; taps use Expo response listener.
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getInitialNotification,
  onNotificationOpenedApp,
  NOTIFICATION_DATA_TYPES,
  type NotificationData,
} from '../services/notifications';
import type { RootStackParamList } from '../navigation/MainTabs';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function navigateFromNotificationData(
  navigation: NavigationProp,
  data: NotificationData,
  isParent: boolean
): void {
  const type = data?.type;
  if (!type) return;
  if (
    type === NOTIFICATION_DATA_TYPES.announcement ||
    type === NOTIFICATION_DATA_TYPES.announcement_reminder
  ) {
    const schoolId = data.schoolId;
    const announcementId = data.announcementId;
    if (isParent && schoolId && announcementId) {
      navigation.navigate('ParentAnnouncementDetail', { schoolId, announcementId });
    } else {
      navigation.navigate(isParent ? 'ParentAnnouncements' : 'Announcements');
    }
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.event_reminder) {
    const schoolId = data.schoolId;
    const eventId = data.eventId;
    if (isParent && schoolId && eventId) {
      navigation.navigate('ParentEventDetail', { schoolId, eventId });
    } else {
      navigation.navigate('Events');
    }
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.daily_report && isParent) {
    const schoolId = data.schoolId;
    const childId = data.childId;
    const reportId = data.reportId;
    if (schoolId && childId && reportId) {
      navigation.navigate('ReportDetail', { schoolId, childId, reportId });
    } else if (schoolId && childId) {
      navigation.navigate('ChildProfile', { schoolId, childId });
    }
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.daily_communication && !isParent) {
    navigation.navigate('DailyCommunication');
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.chat_message) {
    const schoolId = data.schoolId;
    const chatId = data.chatId;
    if (schoolId && chatId) {
      navigation.navigate('ChatThread', { schoolId, chatId });
    } else {
      navigation.navigate(isParent ? 'ParentSelectChildToMessage' : 'SelectChildToMessage');
    }
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.class_assigned && !isParent) {
    navigation.navigate('MainTabs');
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.child_joined_class && !isParent) {
    const childId = data.childId;
    if (childId) {
      navigation.navigate('Reports', { childId });
    } else {
      navigation.navigate('MainTabs');
    }
    return;
  }
}

/**
 * Call from a screen that is always mounted when user is logged in (e.g. TeacherHomeScreen or ParentHomeScreen).
 * Uses the stack navigator (parent of tab nav) to navigate when user opens app from a notification.
 */
export function useNotificationNavigation(isParent: boolean): void {
  const navigation = useNavigation<NavigationProp>();
  const stack = navigation.getParent() as NavigationProp | undefined;

  useEffect(() => {
    if (!stack) return;

    getInitialNotification().then((msg) => {
      if (msg?.data) navigateFromNotificationData(stack, msg.data as NotificationData, isParent);
    });

    const unsubscribe = onNotificationOpenedApp((msg) => {
      if (msg?.data) navigateFromNotificationData(stack, msg.data as NotificationData, isParent);
    });

    let expoSub: { remove: () => void } | undefined;
    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      expoSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const raw = response.notification.request.content.data;
        if (raw && typeof raw === 'object' && raw !== null && 'type' in raw) {
          navigateFromNotificationData(stack, raw as NotificationData, isParent);
        }
      });
    } catch {
      // Expo Go / missing module
    }

    return () => {
      unsubscribe?.();
      expoSub?.remove();
    };
  }, [stack, isParent]);
}
