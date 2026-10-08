'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChildStep, ConsentStep, DoneStep, ParentStep } from './RegisterSteps';
import { useJoinRegistration } from './useJoinRegistration';

export default function JoinRegisterPage() {
  const params = useParams<{ schoolSlug: string }>();
  const searchParams = useSearchParams();
  const slug = useMemo(() => String(params.schoolSlug || '').trim(), [params.schoolSlug]);
  const session = searchParams.get('session')?.trim() || '';
  const qr = searchParams.get('qr')?.trim() || '';
  const r = useJoinRegistration(slug, session, qr);
  const { step } = r;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-warm-50 to-primary-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Step {step} of 4</p>
            {step !== 4 && (
              <div className="h-2 w-28 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-primary-600" style={{ width: `${(step / 4) * 100}%` }} aria-hidden />
              </div>
            )}
          </div>
          {step === 1 && <ParentStep r={r} />}
          {step === 2 && <ChildStep r={r} />}
          {step === 3 && <ConsentStep r={r} />}
          {step === 4 && <DoneStep teacherName={r.success?.teacherName} />}
          {r.error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{r.error}</p>}
          {step !== 4 && (
            <div className="mt-6 flex gap-2">
              {step !== 1 && (
                <button type="button" onClick={r.back} disabled={r.submitting} className="btn-secondary w-full">
                  Back
                </button>
              )}
              <button type="button" onClick={r.next} disabled={r.submitting} className="btn-primary w-full">
                {step === 3 ? (r.submitting ? 'Submitting…' : 'Finish') : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
