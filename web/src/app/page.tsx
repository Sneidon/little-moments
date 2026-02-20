'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace('/login');
      return;
    }
    if (profile.role === 'principal') {
      router.replace('/principal');
      return;
    }
    if (profile.role === 'super_admin') {
      router.replace('/admin');
      return;
    }
    router.replace('/login');
  }, [user, profile, loading, router]);

  return <LoadingScreen message="Taking you to your dashboard…" />;
}
