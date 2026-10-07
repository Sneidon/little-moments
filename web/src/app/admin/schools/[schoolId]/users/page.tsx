'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { InviteSchoolAdminForm } from '@/app/principal/staff/components/InviteSchoolAdminForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PasswordResetDialog, PasswordResetNotice, ResetPasswordButton } from '@/components/PasswordReset';
import { PageHero, SectionCard } from '@/components/ui';
import { usePasswordReset } from '@/hooks/usePasswordReset';
import { userHasRole } from '@/lib/roles';
import type { UserProfile } from 'shared/types';
import { useInviteSchoolAdmin } from './useInviteSchoolAdmin';
import { useSchoolUsers } from './useSchoolUsers';

const TH = 'px-4 py-3 font-medium text-slate-700 dark:text-slate-200';

function roleLabel(u: UserProfile, isPrincipal: boolean, isTeacher: boolean) {
  return [isPrincipal ? 'school admin' : null, isTeacher ? 'teacher' : null, !isPrincipal && !isTeacher ? u.role : null].filter(Boolean).join(', ');
}

export default function AdminSchoolUsersPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : undefined;
  const { schoolName, users, loading, error } = useSchoolUsers(schoolId);
  const reset = usePasswordReset<UserProfile>();
  const invite = useInviteSchoolAdmin(schoolId);

  if (!schoolId) return null;
  if (loading && !schoolName && !error) return <LoadingScreen message="Loading…" variant="primary" />;
  if (error) {
    return (
      <div className="animate-fade-in">
        <Link href="/admin/users" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
          ← Back to Users
        </Link>
        <div className="mt-6 rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PasswordResetDialog reset={reset} />
      <PageHero
        variant="full"
        backHref={`/admin/schools/${schoolId}`}
        backLabel={schoolName || 'school'}
        title={<span className="text-gradient-warm">Users</span>}
        subtitle={`${schoolName || 'School'} — staff and school admins`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={invite.show} className="btn-primary">
              Invite school admin
            </button>
            <Link href="/admin/users" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
              All users
            </Link>
          </div>
        }
      />
      {invite.open && (
        <InviteSchoolAdminForm
          form={invite.form}
          setForm={invite.setForm}
          error={invite.error}
          submitting={invite.submitting}
          inviteResult={invite.result}
          onSubmit={invite.submit}
          onCancel={invite.close}
        />
      )}
      <PasswordResetNotice reset={reset} />
      <SectionCard topBar="accent" padding="none">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Email</th>
                <th className={TH}>Role</th>
                <th className={`w-0 text-right ${TH}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isPrincipal = userHasRole(u, 'principal');
                const isTeacher = userHasRole(u, 'teacher');
                return (
                  <tr key={u.uid} className="border-t border-slate-100 dark:border-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.preferredName ?? u.displayName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          isPrincipal
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {roleLabel(u, isPrincipal, isTeacher)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {(isPrincipal || isTeacher) && u.email ? (
                        <ResetPasswordButton onClick={() => reset.setPending(u)} disabled={!!reset.loadingUid} sending={reset.loadingUid === u.uid} />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No users (school admins or teachers) for this school.</p>
        )}
      </SectionCard>
    </div>
  );
}
