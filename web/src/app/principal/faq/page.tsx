'use client';

import Link from 'next/link';

const FAQ_ITEMS = [
  { q: 'How do I add a child?', a: 'Go to People → Children and click "Add child". Link the child to a class and parent(s).' },
  { q: 'How do teachers log meals and activities?', a: 'Teachers use the mobile app Add Update tab. Select children and use Meal, Nap, Nappy, Activity, or Photo options.' },
  { q: 'How do parents view updates?', a: 'Parents receive push notifications and view the daily report in the app under the child profile.' },
  { q: 'How do I create an announcement?', a: 'Go to Content & communication → Announcements, click "New announcement", enter title and body, choose everyone or specific classes.' },
  { q: 'How do I configure school features?', a: 'Super admins: Admin → Schools → [School] → Configure school. Enable/disable nappy, nap, meal, medication, incident, media.' },
  { q: 'Who can edit child profiles?', a: 'Principals (web), teachers (mobile – their class), parents (mobile – their children).' },
];

export default function FAQPage() {
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
        <Link href="/principal/support" className="text-primary-600 dark:text-primary-400 hover:underline">
          Contact support
        </Link>{' '}
        if you need more help.
      </p>
    </div>
  );
}
