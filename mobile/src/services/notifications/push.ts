import { PermissionsAndroid, Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../config/firebase';
import { expoNotifications, fcm } from './nativeModules';

let registration: Promise<void> | null = null;
let tokenRefreshUnsubscribe: (() => void) | null = null;

async function saveToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;
  await httpsCallable<{ token: string }, { ok: boolean }>(getFunctions(app), 'saveFcmToken')({ token: trimmed });
}

function isFcmAuthorized(status: number): boolean {
  const Auth = fcm?.AuthorizationStatus as { AUTHORIZED: number; PROVISIONAL: number } | undefined;
  if (!Auth) return status === 1 || status === 2;
  return status === Auth.AUTHORIZED || status === Auth.PROVISIONAL;
}

async function expoPermissionGranted(): Promise<boolean> {
  if (!expoNotifications) return true;
  try {
    const existing = await expoNotifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await expoNotifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return requested.status === 'granted';
  } catch (e) {
    console.warn('expo-notifications permission request failed:', e);
    return true;
  }
}

async function androidPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn('Android POST_NOTIFICATIONS request failed:', e);
    return false;
  }
}

async function iosFcmPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !fcm) return true;
  try {
    return isFcmAuthorized(await fcm.requestPermission(fcm.getMessaging()));
  } catch (e) {
    console.warn('Firebase messaging requestPermission failed:', e);
    return false;
  }
}

// expo-notifications asks first because its iOS prompt is the reliable one.
async function requestPermissions(): Promise<boolean> {
  return (await expoPermissionGranted()) && (await androidPermissionGranted()) && (await iosFcmPermissionGranted());
}

export async function registerForPushNotifications(): Promise<void> {
  const messaging = fcm;
  if (!messaging) {
    console.warn('Push notifications unavailable (Expo Go or missing native FCM module).');
    return;
  }
  if (registration) return registration;

  registration = (async () => {
    try {
      if (!(await requestPermissions())) return;
      const token = await messaging.getToken(messaging.getMessaging());
      if (!token?.trim()) {
        console.warn('FCM getToken returned empty');
        return;
      }
      await saveToken(token);
      tokenRefreshUnsubscribe ??= messaging.onTokenRefresh(messaging.getMessaging(), (next) => {
        saveToken(next).catch(() => {});
      });
    } catch (e) {
      console.warn('Push registration failed:', e);
    } finally {
      registration = null;
    }
  })();
  return registration;
}
