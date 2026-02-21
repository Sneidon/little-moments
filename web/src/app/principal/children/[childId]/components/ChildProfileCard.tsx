import type { Child } from 'shared/types';

export interface ChildProfileCardProps {
  child: Child;
  ageText: string;
  classDisplay: string;
}

export function ChildProfileCard({ child, ageText, classDisplay }: ChildProfileCardProps) {
  const hasAllergies = child.allergies?.length;
  const hasCareInfo = child.medicalNotes || child.emergencyContact || child.emergencyContactName;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Age</p>
          <p className="text-slate-800 dark:text-slate-200">{ageText}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of birth</p>
          <p className="text-slate-800 dark:text-slate-200">
            {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Class</p>
          <p className="text-slate-800 dark:text-slate-200">{classDisplay}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Enrollment</p>
          <p className="text-slate-800 dark:text-slate-200">
            {child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {hasAllergies ? (
        <div className="mt-6 rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs"
              aria-hidden
            >
              !
            </span>
            Allergies
          </p>
          <ul className="flex flex-wrap gap-2" role="list">
            {child.allergies!.map((allergy, idx) => (
              <li key={idx}>
                <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/60 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100">
                  {allergy.trim()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasCareInfo ? (
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Care information</h3>
          <div className="space-y-3">
            {child.medicalNotes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Medical notes
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{child.medicalNotes}</p>
              </div>
            ) : null}
            {(child.emergencyContactName || child.emergencyContact) ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Emergency contact
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {child.emergencyContactName || '—'}
                  {child.emergencyContact ? (
                    <a
                      href={`tel:${child.emergencyContact}`}
                      className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {child.emergencyContact}
                    </a>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
