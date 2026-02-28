'use client';

import Link from 'next/link';

const FAQ_ITEMS = [
  { q: 'How do I add a school?', a: 'Go to Schools and click "Add school". Enter name and principal details.' },
  { q: 'How do I configure school features?', a: 'Go to Schools → [School] → Configure school. Enable/disable nappy, nap, meal, medication, incident, media per school.' },
  { q: 'How do I view usage?', a: 'Go to Usage & analytics for an overview, or Schools → [School] → Usage & analytics for per-school stats (children, parents, teachers, reports).' },
];

export default function AdminFAQPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-100">Frequently asked questions</h1>
      <div className="space-y-6">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.q}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/admin/support" className="text-primary-600 dark:text-primary-400 hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}
