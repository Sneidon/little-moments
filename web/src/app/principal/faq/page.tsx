'use client';

import Link from 'next/link';
import { PageHero } from '@/components/ui';

type FAQItem = { category: string; q: string; a: string };

const FAQ_ITEMS: FAQItem[] = [
  // Getting started
  {
    category: 'Getting started',
    q: 'What can I do as a principal?',
    a: 'You manage your school from the web dashboard: add and manage children, classes, staff, and parents; create announcements and events; set up meal options; run reports; and adjust school settings. Teachers and parents use the mobile app for day-to-day updates and viewing.',
  },
  {
    category: 'Getting started',
    q: 'How do I get teachers and parents onto the app?',
    a: 'Add staff under People → Staff and parents under People → Parents (or link them when adding a child). They sign in with the email you used. You can share the app download link (App Store / Play Store) and they log in with that email; invite emails are sent when you add them.',
  },

  // Children
  {
    category: 'Children',
    q: 'How do I add a child?',
    a: 'Go to People → Children and click "Add child". Enter the child\'s details, then link them to a class and one or more parents. You can also set dietary needs, allergies, and other notes in the child profile.',
  },
  {
    category: 'Children',
    q: 'How do I edit or remove a child?',
    a: 'In People → Children, open the child and use Edit to change details, class, or parent links. To remove a child, use the remove/archive option on the child profile (this may depend on your school\'s data retention policy).',
  },
  {
    category: 'Children',
    q: 'Who can edit child profiles?',
    a: 'Principals can edit any child on the web. Teachers can edit children in their class via the mobile app (limited fields). Parents can view and sometimes edit their own children\'s details (e.g. contact info) in the app, depending on your settings.',
  },
  {
    category: 'Children',
    q: 'Can a child be in more than one class or have multiple parents?',
    a: 'Yes. When adding or editing a child, you can assign one primary class and link multiple parents (e.g. both guardians). All linked parents will see that child\'s updates in the app.',
  },

  // Classes
  {
    category: 'Classes',
    q: 'How do I create and manage classes?',
    a: 'Go to People → Classes. Create a new class with a name (e.g. "Toddlers", "Pre-K"). Then assign teachers to the class and move children into it from the Children or Classes page.',
  },
  {
    category: 'Classes',
    q: 'How do I assign teachers to a class?',
    a: 'In People → Classes, open the class and add or remove staff. Only teachers assigned to a class can log updates (meals, naps, activities, photos) for children in that class on the mobile app.',
  },
  {
    category: 'Classes',
    q: 'What happens if I move a child to a different class?',
    a: 'The child will appear in the new class for teachers. Past updates stay tied to the child. Make sure the new class has the right teachers so they can continue logging updates.',
  },

  // Staff & parents
  {
    category: 'Staff & parents',
    q: 'How do I add staff (teachers)?',
    a: 'Go to People → Staff, click "Add staff", and enter their name and email. Assign them to one or more classes. They receive an invite to sign in to the mobile app with that email.',
  },
  {
    category: 'Staff & parents',
    q: 'How do I add or link parents?',
    a: 'You can add a parent from People → Parents, or link them when adding/editing a child. Enter the parent\'s email; they\'ll be able to sign in to the app and see updates for any children linked to them.',
  },
  {
    category: 'Staff & parents',
    q: 'Can parents see each other\'s information?',
    a: 'No. Each parent only sees their own profile and the children linked to them. They cannot see other parents or other families\' children.',
  },

  // Content & communication
  {
    category: 'Content & communication',
    q: 'How do I create an announcement?',
    a: 'Go to Content & communication → Announcements, click "New announcement", enter a title and body, then choose to send to everyone or to specific classes. Parents (and optionally staff) will see it in the app.',
  },
  {
    category: 'Content & communication',
    q: 'How do I create and manage events?',
    a: 'Go to Content & communication → Events. Create events with date, time, title, and description. Parents can view upcoming events in the app.',
  },
  {
    category: 'Content & communication',
    q: 'What are meal options / food menus?',
    a: 'Under Content & communication → Meal options you can define the meals and options your school offers (e.g. breakfast, lunch, snacks). Teachers can then select from these when logging meals in the app, so parents see consistent labels.',
  },

  // Teacher logging (meals, activities, etc.)
  {
    category: 'Teacher logging (meals, activities, photos)',
    q: 'How do teachers log meals and activities?',
    a: 'Teachers use the mobile app "Add Update" (or similar) tab. They select one or more children, then choose Meal, Nap, Nappy, Activity, or Photo. For meals they pick from your meal options and can add notes. For activities they can use planned activities or free text.',
  },
  {
    category: 'Teacher logging (meals, activities, photos)',
    q: 'How do teachers log naps and nappy changes?',
    a: 'In the Add Update flow, teachers select Nap (with optional duration) or Nappy (with optional notes). These appear on the child\'s daily report for parents. Nappy and nap logging can be turned on or off in school configuration.',
  },
  {
    category: 'Teacher logging (meals, activities, photos)',
    q: 'How do teachers add photos?',
    a: 'Teachers select children and choose the Photo option, then take or upload a photo. Photos are attached to the child\'s timeline and visible to linked parents. Media/photo features can be enabled or disabled in school settings.',
  },
  {
    category: 'Teacher logging (meals, activities, photos)',
    q: 'Can teachers log medication or incidents?',
    a: 'If your school has medication and incident logging enabled (in Configure school), teachers will see those options in the app. They can record time, details, and any follow-up. Principals and admins can review incidents in reports.',
  },

  // Parents viewing updates
  {
    category: 'Parents viewing updates',
    q: 'How do parents view updates?',
    a: 'Parents receive push notifications when new updates are added. In the app they open their child\'s profile or the daily feed to see meals, naps, activities, photos, and any notes for the day.',
  },
  {
    category: 'Parents viewing updates',
    q: 'Can parents reply or comment on updates?',
    a: 'This depends on your app version and settings. If messaging or comments are enabled, parents may be able to reply; otherwise they view updates only. Check School settings or Contact support for your setup.',
  },

  // Reports & settings
  {
    category: 'Reports & settings',
    q: 'What reports are available?',
    a: 'Go to Reports & settings → Reports. You can typically see attendance, meal summaries, incident reports, and other aggregates by class or date range. Use these for compliance, planning, and parent conversations.',
  },
  {
    category: 'Reports & settings',
    q: 'How do I change school settings?',
    a: 'Go to Reports & settings → School settings. You can update the school name, contact info, and other preferences. Feature toggles (nappy, nap, meal, medication, incident, media) are usually configured by a super admin under Admin → Schools → [Your school] → Configure school.',
  },
  {
    category: 'Reports & settings',
    q: 'How do I configure school features (nappy, nap, meals, etc.)?',
    a: 'Super admins do this in Admin → Schools → [School] → Configure school, where they enable or disable nappy, nap, meal, medication, incident, and media logging. As a principal you use whatever is enabled for your school; contact your admin if you need a feature turned on or off.',
  },

  // Troubleshooting & support
  {
    category: 'Troubleshooting & support',
    q: 'A teacher or parent can\'t log in. What should I check?',
    a: 'Confirm their email is spelled correctly in People → Staff or People → Parents (and that the child is linked to the parent). They must use the same email to sign in. If they forgot the password, they should use "Forgot password" on the login screen. If the issue continues, contact support.',
  },
  {
    category: 'Troubleshooting & support',
    q: 'Updates are not showing for a parent.',
    a: 'Check that the child is linked to that parent in People → Children (edit the child and verify parent links). Ensure the child is in a class and that teachers have been logging updates for that class. Ask the parent to refresh the app or check their notification settings.',
  },
  {
    category: 'Troubleshooting & support',
    q: 'I don\'t see a menu or feature I expect.',
    a: 'Some features are only available to super admins (e.g. adding schools, configuring features). If you\'re a principal, use Reports & settings → School settings for what you can change; for feature toggles or new schools, contact your admin or support.',
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

export default function FAQPage() {
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
        <Link href="/principal/support" className="text-primary-600 dark:text-primary-400 hover:underline">
          Contact support
        </Link>{' '}
        if you need more help.
      </p>
    </div>
  );
}
