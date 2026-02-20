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
    { to: '/admin/schools', label: 'Schools', value: stats.schools },
    { to: '/admin/users', label: 'Total users', value: stats.users },
    { label: 'Teachers', value: stats.teachers },
    { label: 'Principals', value: stats.principals },
    { label: 'Parents', value: stats.parents },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Super Admin Dashboard</h1>
        <p className="mt-1 text-slate-600">Welcome back, {profile?.displayName ?? 'Super Admin'}.</p>
      </div>

      {loading ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100" />
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
                <p className="text-3xl font-bold tabular-nums text-slate-900">{c.value}</p>
                <h2 className="mt-1 font-semibold text-slate-700">{c.label}</h2>
              </Link>
            ) : (
              <div key={c.label} className="card p-6">
                <p className="text-3xl font-bold tabular-nums text-slate-900">{c.value}</p>
                <h2 className="mt-1 font-semibold text-slate-700">{c.label}</h2>
              </div>
            )
          )}
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/schools"
            className="btn-primary inline-flex py-2.5"
          >
            Manage schools
          </Link>
          <Link
            href="/admin/users"
            className="btn-secondary inline-flex"
          >
            Manage users
          </Link>
          <Link
            href="/admin/usage"
            className="btn-secondary inline-flex"
          >
            Usage & analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
