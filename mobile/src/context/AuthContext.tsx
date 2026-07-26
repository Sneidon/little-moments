import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth, db } from '../config/firebase';
import { getCached, setCached, removeCached, PROFILE_TTL_MS } from '../utils/cache';
import { registerForPushNotifications } from '../services/notifications';
import { normalizeUserRoles } from '../utils/roles';
import type { UserProfile, UserRole } from '../../../shared/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedChildId: string | null;
  setSelectedChildId: React.Dispatch<React.SetStateAction<string | null>>;
  refreshProfile: () => Promise<void>;
  /** Session portal after multi-role pick (null = show picker when multiple). */
  sessionPortalRole: UserRole | null;
  setSessionPortalRole: (role: UserRole | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hydrateProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const { roles, role } = normalizeUserRoles(data as { role?: string; roles?: string[] });
  return {
    uid,
    ...data,
    roles,
    role: role ?? (data.role as UserProfile['role']),
  } as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [sessionPortalRole, setSessionPortalRole] = useState<UserRole | null>(null);

  const refreshProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    const cacheKey = `profile:${u.uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const profileData = hydrateProfile(u.uid, snap.data() as Record<string, unknown>);
        setProfile(profileData);
        await setCached(cacheKey, profileData, PROFILE_TTL_MS);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (!u) {
        setProfile(null);
        setSelectedChildId(null);
        setSessionPortalRole(null);
        setLoading(false);
        return;
      }
      const cacheKey = `profile:${u.uid}`;
      try {
        const cached = await getCached<UserProfile>(cacheKey);
        if (cached) {
          const { roles, role } = normalizeUserRoles(cached);
          setProfile({ ...cached, roles, role: role ?? cached.role });
        }
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const profileData = hydrateProfile(u.uid, snap.data() as Record<string, unknown>);
          try {
            const syncClaims = httpsCallable(getFunctions(app), 'syncClaims');
            await syncClaims({});
            await u.getIdToken(true);
          } catch { /* rules may fail until next login if sync fails */ }
          setProfile(profileData);
          await setCached(cacheKey, profileData, PROFILE_TTL_MS);
          registerForPushNotifications().catch(() => {});

          if (profileData.role === 'parent' && profileData.parentStatus === 'ACTIVE' && !(profileData as { firstLoginAt?: string }).firstLoginAt) {
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
        refreshProfile,
        sessionPortalRole,
        setSessionPortalRole,
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
