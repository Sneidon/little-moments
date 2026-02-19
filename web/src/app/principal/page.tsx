'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
    { to: '/principal/children', label: 'Children', value: stats.children, desc: 'Enrolled in your school' },
    { to: '/principal/staff', label: 'Staff', value: stats.staff, desc: 'Teachers & principals' },
    { to: '/principal/reports', label: 'Reports today', value: stats.reportsToday, desc: 'Daily logs submitted' },
    { to: '/principal/events', label: 'Upcoming events', value: stats.upcomingEvents, desc: 'Scheduled events' },
  ];

  const quickLinks = [
    { to: '/principal/announcements', label: 'Announcements' },
    { to: '/principal/food-menus', label: 'Food menus' },
    { to: '/principal/classes', label: 'Classes' },
    { to: '/principal/settings', label: 'School settings' },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mb-6 text-slate-600">Welcome, {profile?.displayName ?? 'Principal'}.</p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ to, label, value, desc }) => (
            <Link
              key={to}
              href={to}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary-500 hover:shadow"
            >
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <h2 className="font-semibold text-slate-800">{label}</h2>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-slate-800">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ to, label }) => (
          <Link
            key={to}
            href={to}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-500 hover:bg-primary-50"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
