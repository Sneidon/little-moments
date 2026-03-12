'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IconChild, IconUsers, IconFileText, IconCalendar } from '@/components/icons/AdminIcons';
import { PageHero, StatCard, QuickActionLink, SectionHeading, StatCardSkeleton } from '@/components/ui';

export default function PrincipalDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    children: 0,
    staff: 0,
    reportsToday: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      try {
        const [childrenSnap, usersSnap, eventsSnap] = await Promise.all([
          getDocs(collection(db, 'schools', schoolId, 'children')),
          getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
          getDocs(collection(db, 'schools', schoolId, 'events')),
        ]);
        const now = new Date().toISOString();
        const upcomingEvents = eventsSnap.docs
          .filter((d) => ((d.data() as { startAt?: string }).startAt ?? '') >= now)
          .slice(0, 10);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        let reportsToday = 0;
        for (const childDoc of childrenSnap.docs) {
          const reportsSnap = await getDocs(
            query(
              collection(db, 'schools', schoolId, 'children', childDoc.id, 'reports'),
              where('timestamp', '>=', todayStart.toISOString()),
              where('timestamp', '<=', todayEnd.toISOString())
            )
          );
          reportsToday += reportsSnap.size;
        }

        setStats({
          children: childrenSnap.size,
          staff: usersSnap.size,
          reportsToday,
          upcomingEvents: upcomingEvents.length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.schoolId]);

  const cards = [
    { to: '/principal/children', label: 'Children', value: stats.children, desc: 'Enrolled in your school', icon: IconChild, bar: 'primary' as const },
    { to: '/principal/staff', label: 'Staff', value: stats.staff, desc: 'Teachers & principals', icon: IconUsers, bar: 'accent' as const },
    { to: '/principal/reports', label: 'Reports today', value: stats.reportsToday, desc: 'Daily logs submitted', icon: IconFileText, bar: 'warm' as const },
    { to: '/principal/events', label: 'Upcoming events', value: stats.upcomingEvents, desc: 'Scheduled events', icon: IconCalendar, bar: 'primary' as const },
  ];

  const quickLinks = [
    { to: '/principal/announcements', label: 'Announcements' },
    { to: '/principal/food-menus', label: 'Meal options' },
    { to: '/principal/classes', label: 'Classes' },
    { to: '/principal/settings', label: 'School settings' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHero
        title={<span className="text-gradient-warm">Dashboard</span>}
        subtitle={
          <>
            Welcome back, <span className="font-bold text-slate-800 dark:text-slate-200">{profile?.displayName ?? 'Principal'}</span>.
          </>
        }
      />

      {loading ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <StatCard
              key={c.to}
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ to, label }) => (
          <QuickActionLink key={to} href={to}>
            {label}
          </QuickActionLink>
        ))}
      </div>
    </div>
  );
}
