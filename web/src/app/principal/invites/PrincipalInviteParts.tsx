import Link from 'next/link';

export type PrincipalInvite = {
  id: string;
  token?: string;
  email: string;
  role: 'teacher' | 'parent';
  schoolName?: string;
  principalName?: string;
  className?: string;
  childId?: string;
  childName?: string;
  inviteeDisplayName?: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

const LINK = 'text-primary-600 hover:underline dark:text-primary-400';

function Invitee({ name }: { name?: string }) {
  return name ? (
    <>
      {' '}
      · <span className="text-slate-700 dark:text-slate-200">{name}</span>
    </>
  ) : null;
}

export function PrincipalInviteContext({ invite }: { invite: PrincipalInvite }) {
  if (invite.role === 'teacher') {
    return (
      <span className="text-slate-600 dark:text-slate-300">
        Staff ·{' '}
        <Link href="/principal/staff" className={LINK}>
          roster
        </Link>
        {invite.schoolName ? (
          <>
            {' '}
            · <span>{invite.schoolName}</span>
          </>
        ) : null}
        <Invitee name={invite.inviteeDisplayName} />
      </span>
    );
  }
  return (
    <span className="text-slate-600 dark:text-slate-300">
      Parent · {invite.childName || 'Child'}
      {invite.childId ? (
        <>
          {' '}
          (
          <Link href={`/principal/children/${invite.childId}`} className={LINK}>
            profile
          </Link>
          )
        </>
      ) : null}
      <Invitee name={invite.inviteeDisplayName} />
    </span>
  );
}

type ShareProps = {
  accepted: boolean;
  disabled: boolean;
  generating: boolean;
  onShowQr: () => void;
  onDownloadPdf: () => void;
};

export function InviteShareButtons({ accepted, disabled, generating, onShowQr, onDownloadPdf }: ShareProps) {
  const acceptedTitle = 'This invite was already accepted';
  return (
    <div className="flex min-w-[9.5rem] flex-col gap-2">
      <button
        type="button"
        onClick={onShowQr}
        disabled={accepted || disabled}
        title={accepted ? acceptedTitle : 'Show QR code for this invite link'}
        className="inline-flex items-center justify-center rounded-lg border border-primary-300 bg-primary-100 px-3 py-2 text-xs font-bold text-primary-950 shadow-sm transition hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-45 dark:border-primary-600 dark:bg-primary-900/50 dark:text-primary-50 dark:hover:bg-primary-900/70"
      >
        Share QR code
      </button>
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={accepted || disabled || generating}
        title={accepted ? acceptedTitle : 'Download printable PDF (same messaging as email + QR)'}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {generating ? 'Generating…' : 'Download PDF'}
      </button>
    </div>
  );
}
