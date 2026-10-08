import type { Event } from 'shared/types';

export type CalendarView = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthGrid(year: number, month: number): (Date | null)[] {
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
  while (out.length % 7) out.push(null);
  return out;
}

export function groupByDate(events: Event[]): Record<string, Event[]> {
  const byDate: Record<string, Event[]> = {};
  for (const ev of events) (byDate[dateKey(new Date(ev.startAt))] ??= []).push(ev);
  return byDate;
}

export function weekStartOf(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function isToday(d: Date): boolean {
  return d.toDateString() === new Date().toDateString();
}

export function shiftDate(d: Date, view: CalendarView, step: 1 | -1): Date {
  if (view === 'daily') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
  if (view === 'weekly') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * step);
  if (view === 'monthly') return new Date(d.getFullYear(), d.getMonth() + step);
  return new Date(d.getFullYear() + step, d.getMonth());
}

export function viewTitle(d: Date, view: CalendarView): string {
  if (view === 'daily') return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (view === 'monthly') return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  if (view === 'yearly') return String(d.getFullYear());
  const start = weekStartOf(d);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
