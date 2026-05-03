import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth, db } from '../config/firebase';
import { getCached, setCached, removeCached, PROFILE_TTL_MS } from '../utils/cache';
import { registerForPushNotifications } from '../services/notifications';
import type { UserProfile, UserRole } from '../../../shared/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedChildId: string | null;
  setSelectedChildId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function selectedChildStorageKey(uid: string) {
  return `lm_parent_selected_child:${uid}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  /** Remember parent’s Home tab child picker across sessions. */
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !selectedChildId) return;
    void AsyncStorage.setItem(selectedChildStorageKey(uid), selectedChildId).catch(() => {});
  }, [user?.uid, selectedChildId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (!u) {
        setProfile(null);
        setSelectedChildId(null);
        setLoading(false);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(selectedChildStorageKey(u.uid));
        setSelectedChildId(stored?.trim() || null);
      } catch {
        setSelectedChildId(null);
      }
      const cacheKey = `profile:${u.uid}`;
      try {
        const cached = await getCached<UserProfile>(cacheKey);
        if (cached) setProfile(cached);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const profileData = { uid: u.uid, ...snap.data() } as UserProfile;
          try {
            const syncClaims = httpsCallable(getFunctions(app), 'syncClaims');
            await syncClaims({});
            await u.getIdToken(true);
          } catch { /* rules may fail until next login if sync fails */ }
          setProfile(profileData);
          await setCached(cacheKey, profileData, PROFILE_TTL_MS);
          // Register FCM token with backend for push notifications (no-op in Expo Go).
          registerForPushNotifications().catch(() => {});

          // Parent activation: record first login once approved (fire-and-forget).
          const ps = (profileData as any).parentStatus as string | undefined;
          const parentActsActive = ps == null || ps === '' || ps === 'ACTIVE';
          if ((profileData as any).role === 'parent' && parentActsActive && !(profileData as any).firstLoginAt) {
            try {
              const record = httpsCallable(getFunctions(app), 'recordParentFirstLogin');
              record({}).catch(() => {});
            } catch {
              // ignore
            }
          }
        } else {
          setProfile(null);
          await removeCached(cacheKey);
        }
      } catch {
        setProfile(null);
        await removeCached(cacheKey);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        selectedChildId,
        setSelectedChildId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
