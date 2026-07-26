'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getWebEligibleRoles, portalPathForRole, selectActiveRole } from '@/lib/roles';

export default function HomePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace('/login');
      return;
    }
    const eligible = getWebEligibleRoles(profile);
    if (eligible.length === 0) {
      router.replace('/login');
      return;
    }
    if (eligible.length > 1) {
      router.replace('/select-role');
      return;
    }
    const only = eligible[0];
    const path = portalPathForRole(only);
    if (!path) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        if (profile.role !== only) {
          await selectActiveRole(only);
          await refreshProfile();
        }
        router.replace(path);
      } catch {
        router.replace('/login');
      }
    })();
  }, [user, profile, loading, router, refreshProfile]);

  return <LoadingScreen message="Taking you to your dashboard…" />;
}
