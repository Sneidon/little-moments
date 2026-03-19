/**
 * Subscribes to notification opened (tap) and navigates to the relevant screen.
 * Backend sends data.type: daily_communication | daily_report | announcement | announcement_reminder | event_reminder.
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

function navigateFromNotification(
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
    navigation.navigate(isParent ? 'ParentAnnouncements' : 'Announcements');
    return;
  }
  if (type === NOTIFICATION_DATA_TYPES.event_reminder) {
    navigation.navigate('Events');
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
      if (msg?.data) navigateFromNotification(stack, msg.data as NotificationData, isParent);
    });

    const unsubscribe = onNotificationOpenedApp((msg) => {
      if (msg?.data) navigateFromNotification(stack, msg.data as NotificationData, isParent);
    });
    return () => unsubscribe?.();
  }, [stack, isParent]);
}
