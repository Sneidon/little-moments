'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
        const users = usersSnap.docs.map((d) => d.data());
        setStats({
          schools: schoolsSnap.size,
          users: usersSnap.size,
          teachers: users.filter((u) => u.role === 'teacher').length,
          principals: users.filter((u) => u.role === 'principal').length,
          parents: users.filter((u) => u.role === 'parent').length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { to: '/admin/schools', label: 'Schools', value: stats.schools, desc: 'Create and manage schools' },
    { to: '/admin/users', label: 'Total users', value: stats.users, desc: 'All platform users' },
    { label: 'Teachers', value: stats.teachers, desc: 'Staff with teacher role' },
    { label: 'Principals', value: stats.principals, desc: 'School principals' },
    { label: 'Parents', value: stats.parents, desc: 'Parent accounts' },
  ];

  const quickLinks = [
    { to: '/admin/schools', label: 'Manage schools' },
    { to: '/admin/users', label: 'Manage users' },
    { to: '/admin/usage', label: 'Usage & analytics' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Welcome back, {profile?.displayName ?? 'Super Admin'}.</p>
      </div>

      {loading ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-36 animate-pulse bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      ) : (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) =>
            c.to ? (
              <Link
                key={c.to}
                href={c.to}
                className="card-hover block p-6"
              >
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{c.value}</p>
                <h2 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{c.label}</h2>
                {c.desc != null && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.desc}</p>
                )}
              </Link>
            ) : (
              <div key={c.label} className="card p-6">
                <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{c.value}</p>
                <h2 className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{c.label}</h2>
                {c.desc != null && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.desc}</p>
                )}
              </div>
            )
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map(({ to, label }) => (
          <Link
            key={to}
            href={to}
            className="card-hover flex items-center px-5 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
