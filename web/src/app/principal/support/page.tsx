'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Contact support</h1>
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
        <p className="text-slate-600 dark:text-slate-300">
          For technical support or questions about My Little Moments, please contact:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <li>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@mylittlemoments.com" className="text-primary-600 dark:text-primary-400 hover:underline">
              support@mylittlemoments.com
            </a>
          </li>
          <li>
            <strong>Response time:</strong> Within 1–2 business days
          </li>
        </ul>
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/principal/faq" className="text-primary-600 dark:text-primary-400 hover:underline">
          View FAQ
        </Link>
      </p>
    </div>
  );
}
