'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [schoolFilter, setSchoolFilter] = useState<string>('');
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [usersSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'schools')),
      ]);
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      setSchools(schoolsSnap.docs.map((d) => ({ id: d.id, name: (d.data() as { name?: string }).name ?? d.id })));
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.displayName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchSchool = !schoolFilter || u.schoolId === schoolFilter;
    return matchSearch && matchRole && matchSchool;
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Users</h1>

      <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="principal">Principal</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">School</label>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-700">School</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.uid} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.displayName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === 'super_admin'
                            ? 'bg-slate-700 text-white'
                            : u.role === 'principal'
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {schools.find((s) => s.id === u.schoolId)?.name ?? u.schoolId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No users match the filters.</p>
          )}
        </div>
      )}

      <p className="mt-4 text-sm text-slate-500">
        User creation and role/school assignment are typically done via Firebase Auth (custom claims)
        and Firestore, or Cloud Functions when users are created or invited.
      </p>
    </div>
  );
}
