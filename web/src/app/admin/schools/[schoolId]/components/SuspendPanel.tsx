type Props = {
  accountSuspended: boolean;
  deletionPending: boolean;
  deletionProcessing: boolean;
  dangerBusy: boolean;
  onReactivate: () => void;
  onSuspend: () => void;
};

export function SuspendPanel({ accountSuspended, deletionPending, deletionProcessing, dangerBusy, onReactivate, onSuspend }: Props) {
  return (
    <div className="relative rounded-xl border border-slate-200/90 bg-slate-50/40 dark:border-slate-600 dark:bg-slate-900/30">
      <div
        className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-600"
        aria-hidden
      />
      <div className="flex flex-col gap-5 p-5 pl-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200/95">
            Access control
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
            Suspend school account
          </h3>
          <ul className="mt-3 list-none space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span>Blocks principals, teachers, and parents from using this school in the apps.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span>Turns off public join and QR registration for new families.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span>Data stays in Firestore until a scheduled purge runs or you remove it elsewhere.</span>
            </li>
          </ul>
          {accountSuspended ? (
            <p className="mt-4 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/70 dark:bg-amber-950/35 dark:text-amber-50">
              <span className="font-medium text-amber-950 dark:text-amber-100">Currently suspended.</span>{' '}
              Staff dashboards and parent access remain blocked until you reactivate below
              {deletionPending ? ' (cancel pending deletion first)' : ''}.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:pt-1">
          {accountSuspended ? (
            <>
              <button
                type="button"
                disabled={dangerBusy || deletionPending || deletionProcessing}
                onClick={onReactivate}
                className="btn-primary w-full whitespace-nowrap px-5 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                Reactivate school account
              </button>
              {deletionPending ? (
                <span className="max-w-[14rem] text-center text-[11px] leading-snug text-amber-800 dark:text-amber-200 sm:text-right">
                  A deletion is queued — cancel that job below to reopen this school.
                </span>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              disabled={dangerBusy}
              onClick={onSuspend}
              className="inline-flex w-full items-center justify-center rounded-xl border-2 border-amber-600/85 bg-white px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-amber-950/40 sm:w-auto"
            >
              Suspend school account
            </button>
          )}
          <span className="text-center text-xs text-slate-500 dark:text-slate-500 sm:text-right">
            Safe to undo later
          </span>
        </div>
      </div>
    </div>
  );
}
