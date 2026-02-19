'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-600)] border-t-transparent" />
    </div>
  );
}
