import Link from 'next/link';
import type { AdminInvite } from './types';

const LINK = 'text-primary-600 hover:underline dark:text-primary-400';

function SchoolLink({ schoolId, name }: { schoolId: string; name?: string }) {
  return (
    <Link href={`/admin/schools/${schoolId}`} className={LINK}>
      {name || 'School'}
    </Link>
  );
}

export function AdminInviteContext({ invite }: { invite: AdminInvite }) {
  const createdSchoolId = invite.createdSchoolId || invite.schoolId;
  const schoolKey = invite.schoolId || createdSchoolId;

  if (invite.role === 'super_admin') {
    return (
      <span className="text-slate-600 dark:text-slate-300">
        Platform super admin
        {invite.inviteeDisplayName ? (
          <>
            {' '}
            · <span className="text-slate-700 dark:text-slate-200">{invite.inviteeDisplayName}</span>
          </>
        ) : null}
      </span>
    );
  }
  if (invite.role === 'teacher' && schoolKey) {
    return (
      <span className="text-slate-600 dark:text-slate-300">
        Teacher at <SchoolLink schoolId={schoolKey} name={invite.schoolName} />
      </span>
    );
  }
  if (invite.role === 'parent' && schoolKey) {
    return (
      <span className="text-slate-600 dark:text-slate-300">
        Parent → {invite.childName || 'Child'}
        {invite.childId ? (
          <>
            {' '}
            (
            <Link href={`/admin/schools/${schoolKey}/children/${invite.childId}`} className={LINK}>
              child record
            </Link>
            )
          </>
        ) : null}{' '}
        · <SchoolLink schoolId={schoolKey} name={invite.schoolName} />
      </span>
    );
  }
  if (createdSchoolId) return <SchoolLink schoolId={createdSchoolId} name={invite.schoolName} />;
  return <span className="text-slate-700 dark:text-slate-200">{invite.schoolName || 'School not created yet'}</span>;
}
