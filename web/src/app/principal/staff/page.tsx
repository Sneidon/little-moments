'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from 'shared/types';
import type { ClassRoom } from 'shared/types';

export default function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    (async () => {
      const [usersSnap, classesSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
        getDocs(collection(db, 'schools', schoolId, 'classes')),
      ]);
      setStaff(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
      setLoading(false);
    })();
  }, [profile?.schoolId]);

  const classForTeacher = (uid: string) =>
    classes.find((c) => c.assignedTeacherId === uid)?.name;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Staff</h1>
      <p className="mb-6 text-slate-600">
        Teachers and principals at your school. User accounts and role assignment are managed in the Super Admin area or via your backend.
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                <th className="px-4 py-3 font-medium text-slate-700">Assigned class</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'principal'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{classForTeacher(u.uid) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">No staff in this school yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
