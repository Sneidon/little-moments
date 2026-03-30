import type { Event } from '../../../../shared/types';

/** Human-readable local start (and optional end time) for an event. */
export function formatEventTimeRange(ev: Event): string {
  const start = new Date(ev.startAt);
  const s = start.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!ev.endAt) return s;
  const end = new Date(ev.endAt);
  const e = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${s} – ${e}`;
}

/** Whether an event is still in the future, in progress, or finished. */
export type EventHighlight = 'upcoming' | 'ongoing' | 'past';

export function getEventHighlight(ev: Event, nowMs: number = Date.now()): EventHighlight {
  const start = new Date(ev.startAt).getTime();
  const end = ev.endAt ? new Date(ev.endAt).getTime() : start;
  if (nowMs > end) return 'past';
  if (nowMs < start) return 'upcoming';
  return 'ongoing';
}

/**
 * Best highlight for a calendar day: ongoing wins, then upcoming, else past-only or empty.
 */
export type DayHighlightLevel = 'ongoing' | 'upcoming' | 'past_only' | 'empty';

/** Events that are not past (upcoming or ongoing), soonest first; ongoing listed before upcoming. */
export function getUpcomingAndOngoingEvents(events: Event[], nowMs: number = Date.now(), limit = 6): Event[] {
  const live = events.filter((ev) => getEventHighlight(ev, nowMs) !== 'past');
  live.sort((a, b) => {
    const ha = getEventHighlight(a, nowMs);
    const hb = getEventHighlight(b, nowMs);
    if (ha === 'ongoing' && hb !== 'ongoing') return -1;
    if (hb === 'ongoing' && ha !== 'ongoing') return 1;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
  return live.slice(0, limit);
}

export function getDayHighlightLevel(
  evs: Event[] | undefined,
  nowMs: number = Date.now()
): DayHighlightLevel {
  if (!evs?.length) return 'empty';
  let hasUpcoming = false;
  let hasOngoing = false;
  let hasPast = false;
  for (const e of evs) {
    const h = getEventHighlight(e, nowMs);
    if (h === 'ongoing') hasOngoing = true;
    else if (h === 'upcoming') hasUpcoming = true;
    else hasPast = true;
  }
  if (hasOngoing) return 'ongoing';
  if (hasUpcoming) return 'upcoming';
  return 'past_only';
}

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Each event appears on every calendar day it spans (start..end inclusive, local dates). */
export function indexEventsByDay(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  const seen = new Map<string, Set<string>>();

  for (const ev of events) {
    const start = new Date(ev.startAt);
    const end = ev.endAt ? new Date(ev.endAt) : start;
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let guard = 0;
    while (cur <= endDay && guard++ < 400) {
      const key = toLocalYMD(cur);
      if (!map.has(key)) {
        map.set(key, []);
        seen.set(key, new Set());
      }
      const ids = seen.get(key)!;
      if (!ids.has(ev.id)) {
        ids.add(ev.id);
        map.get(key)!.push(ev);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return map;
}

/** Rows of week-aligned cells; null = empty pad before/after month. */
export function getMonthGrid(year: number, monthIndex: number): (number | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const leading = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/** Week starting Sunday, date at local midnight. */
export function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function eventsInWeek(events: Event[], weekStart: Date): Event[] {
  const ws = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  const weEnd = addDays(ws, 6);
  weEnd.setHours(23, 59, 59, 999);
  const map = new Map<string, Event>();
  for (const ev of events) {
    const start = new Date(ev.startAt);
    const end = ev.endAt ? new Date(ev.endAt) : start;
    if (end >= ws && start <= weEnd) {
      map.set(ev.id, ev);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

/** Group ordered events by local YMD for week list UI. */
export function groupEventsByDayKeys(
  weekEvents: Event[],
  weekStart: Date
): { ymd: string; label: string; events: Event[] }[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(toLocalYMD(addDays(weekStart, i)));
  }
  const byDay = indexEventsByDay(weekEvents);
  return keys.map((ymd) => {
    const d = parseYmdToLocalDate(ymd);
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return { ymd, label, events: byDay.get(ymd) ?? [] };
  });
}

function parseYmdToLocalDate(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(y, m - 1, day);
}
