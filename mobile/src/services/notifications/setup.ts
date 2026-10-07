import { Platform } from 'react-native';
import { expoNotifications, fcm } from './nativeModules';
import type { ForegroundBannerPayload, RemoteMessage } from './types';

const bannerListeners = new Set<(payload: ForegroundBannerPayload) => void>();
let foregroundUnsubscribe: (() => void) | null = null;

export function subscribeForegroundNotificationBanner(listener: (payload: ForegroundBannerPayload) => void): () => void {
  bannerListeners.add(listener);
  return () => {
    bannerListeners.delete(listener);
  };
}

function emitBanner(message: RemoteMessage) {
  const title = message.notification?.title?.trim();
  const body = message.notification?.body?.trim();
  if (!expoNotifications || (!title && !body)) return;
  const payload = { title: title ?? 'New notification', body: body ?? undefined, data: message.data };
  bannerListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // One failing listener must not stop the others.
    }
  });
}

export function registerBackgroundMessageHandler(): void {
  if (!fcm) return;
  try {
    // The OS shows background notifications itself; nothing to update in the UI here.
    fcm.setBackgroundMessageHandler(fcm.getMessaging(), async () => {});
  } catch {
    return;
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || !expoNotifications) return;
  await expoNotifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: expoNotifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366f1',
  });
}

function configureExpoHandler(): void {
  expoNotifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function configureNotifications(): void {
  try {
    configureExpoHandler();
  } catch {
    // Handler setup is best effort.
  }
  ensureAndroidChannel().catch(() => {});

  if (!fcm || foregroundUnsubscribe) return;
  try {
    // FCM shows no system UI while the app is open, so foreground messages become an in-app banner.
    foregroundUnsubscribe = fcm.onMessage(fcm.getMessaging(), async (message) => emitBanner(message as unknown as RemoteMessage));
  } catch {
    foregroundUnsubscribe = null;
  }
}

export function onNotificationOpenedApp(callback: (message: RemoteMessage) => void): (() => void) | undefined {
  if (!fcm) return undefined;
  try {
    return fcm.onNotificationOpenedApp(fcm.getMessaging(), (message) => callback(message as unknown as RemoteMessage));
  } catch {
    return undefined;
  }
}

export function getInitialNotification(): Promise<RemoteMessage | null> {
  if (!fcm) return Promise.resolve(null);
  try {
    return fcm.getInitialNotification(fcm.getMessaging()) as Promise<RemoteMessage | null>;
  } catch {
    return Promise.resolve(null);
  }
}
