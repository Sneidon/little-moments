'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PasswordResetDialog, PasswordResetNotice } from '@/components/PasswordReset';
import { Notice, PageHero, SectionCard, TableSkeleton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { usePasswordReset } from '@/hooks/usePasswordReset';
import { InviteSuperAdminForm } from './components/InviteSuperAdminForm';
import { SuperAdminsTable } from './components/SuperAdminsTable';
import { useAdminUsers, type SuperAdminUser } from './useAdminUsers';

const TH = 'px-4 py-3 font-medium text-slate-700 dark:text-slate-200';

export default function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const data = useAdminUsers();
  const reset = usePasswordReset<SuperAdminUser>();
  const [showInvite, setShowInvite] = useState(false);
  const { pendingRemove, superAdmins, schools } = data;

  return (
    <div className="animate-fade-in">
      <PasswordResetDialog reset={reset} lockWhileSending />
      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => data.setPendingRemove(null)}
        title="Remove super administrator?"
        message={
          pendingRemove ? `${pendingRemove.email} will permanently lose admin access and their sign-in will be deleted. This cannot be undone.` : ''
        }
        confirmLabel="Remove administrator"
        onConfirm={() => pendingRemove && data.remove(pendingRemove)}
        confirmDisabled={!!data.removingUid}
      />
      <PageHero
        variant="full"
        title={<span className="text-gradient-warm">Users</span>}
        subtitle="Invite administrators by email, or overview users by school below."
        actions={
          <button type="button" onClick={() => setShowInvite(true)} className="btn-primary">
            Invite super admin
          </button>
        }
      />
      {showInvite && <InviteSuperAdminForm onClose={() => setShowInvite(false)} />}

      {data.removeError && (
        <Notice tone="error" onDismiss={data.dismissRemoveError}>
          {data.removeError}
        </Notice>
      )}
      {data.removed && (
        <Notice tone="success" onDismiss={data.dismissRemoved}>
          Super administrator removed.
        </Notice>
      )}
      <PasswordResetNotice reset={reset} />

      {(superAdmins.length > 0 || showInvite) && (
        <SectionCard topBar="warm" padding="default" className="mb-6">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Super admins</span>
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{superAdmins.length}</p>
        </SectionCard>
      )}
      {superAdmins.length > 0 && (
        <SuperAdminsTable
          admins={superAdmins}
          currentUid={authUser?.uid}
          resettingUid={reset.loadingUid}
          removingUid={data.removingUid}
          onReset={reset.setPending}
          onRemove={data.setPendingRemove}
        />
      )}

      <SectionCard topBar="accent" padding="none">
        {data.loading ? (
          <TableSkeleton rows={6} cols={3} />
        ) : (
          <>
            <table className="data-table">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className={TH}>School</th>
                  <th className={TH}>Users</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      <Link href={`/admin/schools/${s.id}/users`} className="text-primary-600 dark:text-primary-400 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.userCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schools.length === 0 && <p className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No schools yet.</p>}
          </>
        )}
      </SectionCard>
    </div>
  );
}
