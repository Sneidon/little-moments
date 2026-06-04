/**
 * Push notifications via Firebase Cloud Messaging (FCM).
 * Aligns with backend: saveFcmToken callable stores token in users.fcmTokens;
 * backend sends via admin.messaging().sendEachForMulticast() with notification + data (type, schoolId, etc).
 * Firebase config files: mobile/firebase/google-services.json (Android), mobile/firebase/GoogleService-Info.plist (iOS).
 *
 * Requires a native build (expo prebuild / EAS build). In Expo Go, FCM is not available and calls no-op.
 */

import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

type MessagingModule = typeof import('@react-native-firebase/messaging').default;

let messaging: MessagingModule | null = null;
let messagingModule: { default: MessagingModule; AuthorizationStatus?: unknown } | null = null;
try {
  messagingModule = require('@react-native-firebase/messaging');
  messaging = messagingModule.default;
} catch {
  // Expo Go or environment without native FCM
}

type ExpoNotificationsModule = typeof import('expo-notifications');
let expoNotifications: ExpoNotificationsModule | null = null;
try {
  expoNotifications = require('expo-notifications');
} catch {
  // Not installed / unavailable (should exist in this app, but keep safe)
}

/** Call once at app startup, before any component mounts. */
export function registerBackgroundMessageHandler(): void {
  if (!messaging) return;
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Backend sends notification + data; system shows notification when in background/quit.
      // No UI updates here; optional: log or persist for later.
      console.log('FCM background:', remoteMessage?.data?.type, remoteMessage?.notification?.title);
    });
  } catch {
    // Ignore in Expo Go
  }
}

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

const foregroundBannerListeners = new Set<(payload: ForegroundBannerPayload) => void>();

export function subscribeForegroundNotificationBanner(
  listener: (payload: ForegroundBannerPayload) => void
): () => void {
  foregroundBannerListeners.add(listener);
  return () => {
    foregroundBannerListeners.delete(listener);
  };
}

function emitForegroundBanner(payload: ForegroundBannerPayload): void {
  foregroundBannerListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Keep notification fan-out resilient.
    }
  });
}

let foregroundBridgeUnsubscribe: (() => void) | null = null;
let tokenRefreshUnsubscribe: (() => void) | null = null;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!expoNotifications) return;
  try {
    await expoNotifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: expoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  } catch {
    // ignore
  }
}

function configureExpoNotificationHandler(): void {
  if (!expoNotifications) return;
  try {
    expoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // ignore
  }
}

async function presentLocalNotificationFromRemoteMessage(message: RemoteMessage): Promise<void> {
  if (!expoNotifications) return;
  const title = message.notification?.title?.trim();
  const body = message.notification?.body?.trim();
  if (!title && !body) return;
  emitForegroundBanner({
    title: title ?? 'New notification',
    body: body ?? undefined,
    data: message.data,
  });
}

/**
 * Call once at app startup (native builds). Ensures:
 * - Android has a notification channel
 * - Foreground notifications can show in-app UI (FCM does not show system UI in foreground)
 */
export function configureNotifications(): void {
  configureExpoNotificationHandler();
  ensureAndroidChannel().catch(() => {});

  if (!messaging) return;
  if (foregroundBridgeUnsubscribe) return;

  try {
    foregroundBridgeUnsubscribe = messaging().onMessage(async (remoteMessage) => {
      await presentLocalNotificationFromRemoteMessage(remoteMessage as unknown as RemoteMessage);
    });
  } catch {
    foregroundBridgeUnsubscribe = null;
  }
}

async function saveTokenToBackend(token: string): Promise<void> {  
  const trimmed = token.trim();
  if (!trimmed) return;
  const saveFcmToken = httpsCallable<{ token: string }, { ok: boolean }>(
    getFunctions(app),
    'saveFcmToken'
  );
  await saveFcmToken({ token: trimmed });
}

/**
 * Request permission (iOS + Android 33+), get FCM token, and save to backend via saveFcmToken.
 * Call after user is signed in.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!messaging) return;
  try {
    if (Platform.OS === 'ios' && messagingModule?.AuthorizationStatus) {
      const authStatus = await messaging().requestPermission();
      const Auth = messagingModule.AuthorizationStatus as { AUTHORIZED: number; PROVISIONAL: number };
      const enabled = authStatus === Auth.AUTHORIZED || authStatus === Auth.PROVISIONAL;
      if (!enabled) return;
    }
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const { PermissionsAndroid } = require('react-native');
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const token = await messaging().getToken();
    if (!token || !token.trim()) return;
    await saveTokenToBackend(token);

    if (!tokenRefreshUnsubscribe) {
      tokenRefreshUnsubscribe = messaging().onTokenRefresh((newToken) => {
        console.log('Token refreshed:', newToken);
        saveTokenToBackend(newToken).catch(() => {});
      });
    }
  } catch (e) {
    console.warn('Push registration failed (expected in Expo Go):', e);
  }
}

/**
 * Subscribe to foreground messages. When app is in foreground, FCM does not show a system notification;
 * use this to show in-app UI or a local notification.
 */
export function onForegroundMessage(callback: (message: RemoteMessage) => void): (() => void) | undefined {
  if (!messaging) return undefined;
  try {
    return messaging().onMessage(callback);
  } catch {
    return undefined;
  }
}

/**
 * Subscribe to notification opened app (user tapped notification while app was in background).
 */
export function onNotificationOpenedApp(callback: (message: RemoteMessage) => void): (() => void) | undefined {
  if (!messaging) return undefined;
  try {
    return messaging().onNotificationOpenedApp(callback);
  } catch {
    return undefined;
  }
}

/**
 * Get the notification that opened the app (cold start from quit). Resolve once.
 */
export function getInitialNotification(): Promise<RemoteMessage | null> {
  if (!messaging) return Promise.resolve(null);
  try {
    return messaging().getInitialNotification() as Promise<RemoteMessage | null>;
  } catch {
    return Promise.resolve(null);
  }
}

/** Backend data payload types for navigation. */
export const NOTIFICATION_DATA_TYPES = {
  daily_communication: 'daily_communication',
  daily_report: 'daily_report',
  announcement: 'announcement',
  announcement_reminder: 'announcement_reminder',
  event_reminder: 'event_reminder',
  chat_message: 'chat_message',
  class_assigned: 'class_assigned',
} as const;
