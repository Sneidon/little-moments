import { useEffect, useRef } from 'react';
import { registerForPushNotifications } from '../services/notifications';

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
