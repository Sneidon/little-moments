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
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Super Admin Dashboard</h1>
      <p className="mb-6 text-slate-600">Welcome, {profile?.displayName ?? 'Super Admin'}.</p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) =>
            c.to ? (
              <Link
                key={c.to}
                href={c.to}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow"
              >
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <h2 className="font-semibold text-slate-700">{c.label}</h2>
              </Link>
            ) : (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <h2 className="font-semibold text-slate-700">{c.label}</h2>
              </div>
            )
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/schools"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Manage schools
          </Link>
          <Link
            href="/admin/users"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Manage users
          </Link>
          <Link
            href="/admin/usage"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Usage & analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
