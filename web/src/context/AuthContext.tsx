'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, app } from '@/config/firebase';
import { InactivitySignOut } from '@/components/InactivitySignOut';
import type { UserProfile } from 'shared/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      let shouldSyncClaims = false;
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const profileData = { uid: u.uid, ...snap.data() } as UserProfile;
          setProfile(profileData);
          shouldSyncClaims = true;
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      }
      setLoading(false);

      // Do not block UI on syncClaims — if the callable hangs or the region is wrong,
      // login still completes; rules may lag until this finishes or the next token refresh.
      if (shouldSyncClaims) {
        void (async () => {
          try {
            const functions = getFunctions(app);
            const syncClaims = httpsCallable(functions, 'syncClaims');
            await syncClaims({});
            await u.getIdToken(true);
          } catch {
            // ignore
          }
        })();
      }
    });
    return () => unsub();
  }, []);

  const refreshProfile = React.useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const profileData = { uid: u.uid, ...snap.data() } as UserProfile;
        setProfile(profileData);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      <InactivitySignOut />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
