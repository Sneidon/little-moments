import { useEffect, useRef } from 'react';
import { registerForPushNotifications } from '../services/notifications';

/**
 * After sign-in, request notification permission (iOS + Android) and register FCM token.
 * Safe to call from home screens; runs once per app session.
 */
export function usePushNotificationRegistration(enabled: boolean): void {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || attemptedRef.current) return;
    attemptedRef.current = true;
    const timer = setTimeout(() => {
      registerForPushNotifications().catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [enabled]);
}
