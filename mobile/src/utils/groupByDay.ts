export type DaySection<T> = { title: string; data: T[] };

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function dayTitle(iso: string | undefined): string {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

// Expects items already sorted newest first; consecutive items on the same day share a section.
export function groupByDay<T extends { createdAt?: string }>(items: T[]): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  for (const item of items) {
    const title = dayTitle(item.createdAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}
