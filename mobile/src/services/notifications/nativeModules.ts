// Both modules are required lazily so Expo Go (no native FCM) can still run the app.
type FcmModule = typeof import('@react-native-firebase/messaging');
type ExpoNotificationsModule = typeof import('expo-notifications');

function tryRequire<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

export const fcm = tryRequire<FcmModule>(() => require('@react-native-firebase/messaging'));
export const expoNotifications = tryRequire<ExpoNotificationsModule>(() => require('expo-notifications'));
