import { useState } from 'react';
import { LogoHeader, SHELL_CARD } from './InviteCards';

const PRIMARY_BUTTON =
  'relative mt-6 w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 dark:focus:ring-offset-slate-900';
const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

type Common = { hasToken: boolean; error: string; submitting: boolean; done: boolean };

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-2">
      <LogoHeader title={<span className="text-gradient-warm">Accept invite</span>}>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </LogoHeader>
    </div>
  );
}

function Notices({ hasToken, error }: { hasToken: boolean; error: string }) {
  return (
    <>
      {!hasToken && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800">
          This invite link is missing a token.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function AcceptExistingCard({ email, accessLabel, onAccept, ...c }: Common & { email?: string; accessLabel: string; onAccept: () => void }) {
  const found = email ? `We found an account for ${email}.` : 'We found an existing account.';
  return (
    <div className={`${SHELL_CARD} transition-all duration-300`}>
      <Header subtitle={`${found} Continue to add ${accessLabel} access — no new password needed.`} />
      <Notices hasToken={c.hasToken} error={c.error} />
      <button type="button" onClick={onAccept} disabled={c.submitting || c.done || !c.hasToken} className={PRIMARY_BUTTON}>
        {c.submitting ? 'Adding access…' : c.done ? 'Done' : `Continue as ${accessLabel}`}
      </button>
    </div>
  );
}

export function AcceptNewForm({ onAccept, ...c }: Common & { onAccept: (details: { password: string; displayName?: string }) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const disabled = c.submitting || c.done || !c.hasToken;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAccept({ password, displayName: displayName.trim() || undefined });
      }}
      className={`${SHELL_CARD} transition-all duration-300`}
      noValidate
    >
      <Header subtitle="Set your account details to finish onboarding." />
      <Notices hasToken={c.hasToken} error="" />
      <div className="space-y-4 mt-4">
        <div>
          <label className={LABEL}>Your name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-base"
            placeholder="e.g. Jane Smith"
            autoComplete="name"
            disabled={disabled}
          />
        </div>
        <div>
          <label className={LABEL}>Set a password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            placeholder="Min 6 characters"
            minLength={6}
            autoComplete="new-password"
            disabled={disabled}
          />
        </div>
      </div>
      <Notices hasToken error={c.error} />
      <button type="submit" disabled={disabled} className={PRIMARY_BUTTON}>
        {c.submitting ? 'Setting up…' : c.done ? 'Done' : 'Accept invite'}
      </button>
    </form>
  );
}
