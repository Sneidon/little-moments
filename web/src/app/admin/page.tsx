'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IconSchool, IconUsers, IconChart } from '@/components/icons/AdminIcons';
import { PageHero, StatCard, QuickActionLink, SectionHeading, StatCardSkeleton } from '@/components/ui';
import { userHoldsRole } from '@/lib/roles';
import type { UserProfile } from 'shared/types';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    teachers: 0,
    principals: 0,
    parents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [schoolsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'schools')),
          getDocs(collection(db, 'users')),
        ]);
        const users = usersSnap.docs.map((d) => d.data() as UserProfile);
        setStats({
          schools: schoolsSnap.size,
          users: usersSnap.size,
          teachers: users.filter((u) => userHoldsRole(u, 'teacher')).length,
          principals: users.filter((u) => userHoldsRole(u, 'principal')).length,
          parents: users.filter((u) => userHoldsRole(u, 'parent')).length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { to: '/admin/schools', label: 'Schools', value: stats.schools, desc: 'Create and manage schools', icon: IconSchool, bar: 'primary' as const },
    { to: '/admin/users', label: 'Total users', value: stats.users, desc: 'All platform users', icon: IconUsers, bar: 'accent' as const },
    { label: 'Teachers', value: stats.teachers, desc: 'Staff with teacher role', icon: IconUsers, bar: 'warm' as const },
    { label: 'Principals', value: stats.principals, desc: 'School principals', icon: IconUsers, bar: 'primary' as const },
    { label: 'Parents', value: stats.parents, desc: 'Parent accounts', icon: IconUsers, bar: 'accent' as const },
  ];

  const quickLinks = [
    { to: '/admin/schools', label: 'Manage schools' },
    { to: '/admin/invites', label: 'View invites & statuses' },
    { to: '/admin/users', label: 'Manage users' },
    { to: '/admin/usage', label: 'Usage & analytics' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHero
        title={<span className="text-gradient-warm">Dashboard</span>}
        subtitle={
          <>
            Welcome back, <span className="font-bold text-slate-800 dark:text-slate-200">{profile?.displayName ?? 'Super Admin'}</span>. Manage your daycares and schools.
          </>
        }
      />

      {loading ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c, i) => (
            <StatCard
              key={c.to ?? c.label}
              to={c.to}
              label={c.label}
              value={c.value}
              desc={c.desc}
              icon={c.icon}
              bar={c.bar}
              gradientValue={i === 0}
              animationDelay={i * 60}
            />
          ))}
        </div>
      )}

      <SectionHeading>Quick actions</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map(({ to, label }) => (
          <QuickActionLink key={to} href={to}>
            {label}
          </QuickActionLink>
        ))}
      </div>
    </div>
  );
}
