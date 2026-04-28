import { Suspense } from 'react';
import AcceptInviteClient from './AcceptInviteClient';

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
          Loading…
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}

