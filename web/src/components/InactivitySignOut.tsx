'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

const IDLE_MS = 15 * 60 * 1000;
const THROTTLE_MS = 1000;

/**
 * Signs the user out after IDLE_MS with no input while the tab is visible.
 * Timer pauses when the document is hidden (another tab / minimized).
 */
export function InactivitySignOut() {
  const [signedIn, setSignedIn] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBumpRef = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setSignedIn(!!u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const clearIdleTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleSignOut = () => {
      clearIdleTimer();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void signOut(auth);
      }, IDLE_MS);
    };

    const bumpActivity = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastBumpRef.current < THROTTLE_MS) return;
      lastBumpRef.current = now;
      scheduleSignOut();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearIdleTimer();
        return;
      }
      lastBumpRef.current = Date.now();
      scheduleSignOut();
    };

    scheduleSignOut();

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const events: (keyof DocumentEventMap)[] = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'click',
    ];
    for (const evt of events) {
      document.addEventListener(evt, bumpActivity, opts);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearIdleTimer();
      for (const evt of events) {
        document.removeEventListener(evt, bumpActivity, opts);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [signedIn]);

  return null;
}
