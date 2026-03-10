'use client';

import Link from 'next/link';
import { PageHero } from '@/components/ui';

type FAQItem = { category: string; q: string; a: string };

const FAQ_ITEMS: FAQItem[] = [
  // Schools
  {
    category: 'Schools',
    q: 'How do I add a school?',
    a: 'Go to Schools and click "Add school". Enter the school name and assign a principal (by email). The principal will receive access to the web dashboard for that school and can then add children, classes, staff, and parents.',
  },
  {
    category: 'Schools',
    q: 'How do I edit or remove a school?',
    a: 'In Schools, open the school and use Edit to change name, principal, or other details. To remove or deactivate a school, use the options on the school profile; this may affect all associated data (children, staff, reports), so use with care and check data retention policies.',
  },
  {
    category: 'Schools',
    q: 'How do I assign or change a principal for a school?',
    a: 'Open the school in Schools, then Edit. Set the principal by email. That user must have a principal (or equivalent) role. They will see the school in their dashboard and can manage it; the previous principal will lose access when replaced.',
  },

  // Configuring schools
  {
    category: 'Configuring schools',
    q: 'How do I configure school features?',
    a: 'Go to Schools → [School] → Configure school. There you can enable or disable per school: nappy logging, nap logging, meal logging, medication logging, incident reporting, and media/photos. These control what teachers see in the mobile app for that school.',
  },
  {
    category: 'Configuring schools',
    q: 'What do the nappy, nap, meal, medication, incident, and media toggles do?',
    a: 'Each toggle turns on or off that type of logging in the teacher app for that school. For example: Meal enables teachers to log meals from your meal options; Incident enables incident reports; Media enables photo uploads. Disabling a feature hides it from teachers and prevents new entries; existing data may still be visible in reports.',
  },
  {
    category: 'Configuring schools',
    q: 'Can different schools have different features enabled?',
    a: 'Yes. Configuration is per school. One school might have medication and incidents on, another might have only meals and naps. Each principal sees and uses only the features enabled for their school.',
  },

  // Usage & analytics
  {
    category: 'Usage & analytics',
    q: 'How do I view usage and analytics?',
    a: 'Use the main Usage & analytics section for a platform-wide overview. For a single school, go to Schools → [School] → Usage & analytics (or the equivalent tab). You’ll see metrics such as number of children, parents, teachers, and reports over time.',
  },
  {
    category: 'Usage & analytics',
    q: 'What metrics are available?',
    a: 'Typical metrics include: counts of children, parents, and teachers per school; number of updates or reports generated; and sometimes activity over time (e.g. daily or weekly). Use these for capacity planning, adoption, and support.',
  },
  {
    category: 'Usage & analytics',
    q: 'Can I export or download reports?',
    a: 'If export is available, it will be in the Reports or Usage & analytics area (e.g. CSV or PDF). Otherwise, principals can run reports from their dashboard. For bulk data export or compliance, contact support.',
  },

  // Principals and access
  {
    category: 'Principals and access',
    q: 'How does a principal get access to their school?',
    a: 'When you add a school and set the principal’s email, that user gets access to the principal web dashboard for that school. They must sign in with the same email. If they don’t have an account yet, they may need to complete sign-up or accept an invite first.',
  },
  {
    category: 'Principals and access',
    q: 'Can one person be principal of multiple schools?',
    a: 'This depends on your setup. If the platform supports multiple schools per principal, assign the same principal to each school in Schools → [School] → Edit. They will then see each school in their dashboard (often via a school selector).',
  },
  {
    category: 'Principals and access',
    q: 'What can super admins do that principals cannot?',
    a: 'Super admins can add and remove schools, configure school-level feature toggles, view platform-wide usage and analytics, and manage global settings. Principals can only manage their assigned school(s): people, content, reports, and school settings within what’s configured.',
  },

  // Data and security
  {
    category: 'Data and security',
    q: 'Where is data stored and is it secure?',
    a: 'Data is stored in secure cloud infrastructure (e.g. Firebase). Access is role-based: principals see only their school; teachers and parents see only what’s relevant to them. For exact compliance details (e.g. GDPR, location), check your contract or contact support.',
  },
  {
    category: 'Data and security',
    q: 'How do I handle a data or access request (e.g. parent leaving)?',
    a: 'Principals can unlink a parent from a child or remove/archive a child as needed. For full account deletion or data export requests, follow your organisation’s process and use the support channel; we can assist with bulk or sensitive requests.',
  },

  // Troubleshooting & support
  {
    category: 'Troubleshooting & support',
    q: 'A principal says they can’t see their school.',
    a: 'Confirm the principal’s email in Schools → [School] matches the email they use to log in. Ensure their role is set to principal (or equivalent). If they have multiple schools, they may need to select the school from a dropdown. If it still fails, contact support with the school and user email.',
  },
  {
    category: 'Troubleshooting & support',
    q: 'I need to turn on a feature (e.g. incidents) for a school.',
    a: 'Go to Schools → [School] → Configure school and enable the relevant toggle. The change applies to that school; teachers may need to refresh the app to see the new option.',
  },
  {
    category: 'Troubleshooting & support',
    q: 'Where do I get help for something not covered here?',
    a: 'Use the Contact support link below to reach the team. Include your role (super admin), school name if relevant, and a short description of the issue or request.',
  },
];

function groupByCategory(items: FAQItem[]): { category: string; items: FAQItem[] }[] {
  const map = new Map<string, FAQItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

export default function AdminFAQPage() {
  const sections = groupByCategory(FAQ_ITEMS);

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <PageHero variant="full" title={<span className="text-gradient-warm">Frequently asked questions</span>} className="mb-8" />
      <div className="space-y-10">
        {sections.map(({ category, items }) => (
          <section key={category} aria-labelledby={`faq-${category.replace(/\s+/g, '-')}`}>
            <h2 id={`faq-${category.replace(/\s+/g, '-')}`} className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
              {category}
            </h2>
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={`${category}-${i}`} className="rounded-card border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.q}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/admin/support" className="text-primary-600 dark:text-primary-400 hover:underline">
          Contact support
        </Link>{' '}
        if you need more help.
      </p>
    </div>
  );
}
