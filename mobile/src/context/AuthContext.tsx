import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCached, setCached, removeCached, PROFILE_TTL_MS } from '../utils/cache';
import type { UserProfile, UserRole } from '../../../shared/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedChildId: string | null;
  setSelectedChildId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (!u) {
        setProfile(null);
        setSelectedChildId(null);
        setLoading(false);
        return;
      }
      const cacheKey = `profile:${u.uid}`;
      try {
        const cached = await getCached<UserProfile>(cacheKey);
        if (cached) setProfile(cached);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const profileData = { uid: u.uid, ...snap.data() } as UserProfile;
          setProfile(profileData);
          await setCached(cacheKey, profileData, PROFILE_TTL_MS);
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
