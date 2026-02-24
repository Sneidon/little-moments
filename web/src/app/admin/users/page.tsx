'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

type SchoolUserCount = {
  id: string;
  name: string;
  userCount: number;
};

export default function AdminUsersPage() {
  const [schools, setSchools] = useState<SchoolUserCount[]>([]);
  const [superAdminCount, setSuperAdminCount] = useState(0);
  const [parentCount, setParentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const schoolsSnap = await getDocs(collection(db, 'schools'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as { schoolId?: string; role?: string }));

        const superAdmins = users.filter((u) => u.role === 'super_admin').length;
        const parents = users.filter((u) => u.role === 'parent').length;
        setSuperAdminCount(superAdmins);
        setParentCount(parents);

        const list: SchoolUserCount[] = schoolsSnap.docs.map((doc) => {
          const schoolId = doc.id;
          const name = (doc.data() as { name?: string }).name ?? schoolId;
          const userCount = users.filter((u) => u.schoolId === schoolId).length;
          return { id: schoolId, name, userCount };
        });
        setSchools(list);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Users</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Overview by school. Click a school to view and manage its users.
        </p>
      </div>

      {(superAdminCount > 0 || parentCount > 0) && (
        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
          {superAdminCount > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Super admins</span>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{superAdminCount}</p>
            </div>
          )}
          {parentCount > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Parents (all)</span>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{parentCount}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">School</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Users</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    <Link
                      href={`/admin/schools/${s.id}/users`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {schools.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
