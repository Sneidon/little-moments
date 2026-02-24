'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminSchoolUsersPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const [schoolName, setSchoolName] = useState<string>('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [schoolSnap, usersSnap] = await Promise.all([
          getDoc(doc(db, 'schools', schoolId)),
          getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
        ]);
        if (!schoolSnap.exists()) {
          setError('School not found');
          setLoading(false);
          return;
        }
        setSchoolName((schoolSnap.data() as { name?: string }).name ?? schoolId);
        setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  if (!schoolId) return null;

  if (loading && !schoolName && !error) {
    return <LoadingScreen message="Loading…" variant="primary" />;
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/admin/users"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to Users
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          ← Back to Users
        </Link>
        <Link
          href={`/admin/schools/${schoolId}`}
          className="ml-4 text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          Back to {schoolName || 'school'}
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Users
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {schoolName || 'School'} — staff and principals
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {u.preferredName ?? u.displayName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.role === 'principal'
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
            No users (principals or teachers) for this school.
          </p>
        )}
      </div>
    </div>
  );
}
