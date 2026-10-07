import type { Ionicons } from '@expo/vector-icons';
import { toIso } from '../../../utils';
import type { Event } from '@shared/types';
import { getEventHighlight, type EventHighlight } from '../calendar/calendarUtils';

export type Rsvp = 'accepted' | 'declined';

export function normalizeEvent(id: string, data: Record<string, unknown>): Event {
  const optional = (v: unknown) => (v != null ? String(v) : undefined);
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    title: String(data.title ?? 'Event'),
    description: optional(data.description),
    imageUrl: optional(data.imageUrl),
    mediaType: optional(data.mediaType),
    documents: data.documents as Event['documents'],
    links: data.links as Event['links'],
    startAt: toIso(data.startAt),
    endAt: data.endAt != null ? toIso(data.endAt) : undefined,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toIso(data.createdAt),
    targetType: data.targetType as Event['targetType'],
    targetClassIds: data.targetClassIds as Event['targetClassIds'],
    parentResponses: data.parentResponses as Event['parentResponses'],
  };
}

export function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url);
}

export function docIcon(url: string): keyof typeof Ionicons.glyphMap {
  if (/\.pdf(\?|#|$)/i.test(url)) return 'document-text-outline';
  if (isLikelyImageUrl(url)) return 'image-outline';
  return 'attach-outline';
}

function durationLabel(start: Date, end: Date | null): string | null {
  if (!end) return null;
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hour${h === 1 ? '' : 's'}`;
  return `${m} min`;
}

function startsIn(diff: number): string {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days >= 1) return `Starts in ${days} day${days === 1 ? '' : 's'}`;
  if (hours >= 1) return `Starts in about ${hours} hour${hours === 1 ? '' : 's'}`;
  const min = Math.max(1, Math.floor(diff / 60000));
  return min >= 60 ? `Starts in ${Math.floor(min / 60)}h ${min % 60}m` : `Starts in ${min} min`;
}

function endsIn(end: Date | null, nowMs: number): string {
  if (!end) return 'In progress';
  const diff = end.getTime() - nowMs;
  if (diff <= 0) return 'Ending soon';
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min >= 120) return `Ends in ${Math.floor(min / 60)} hours`;
  if (min >= 60) return `Ends in ${Math.floor(min / 60)}h ${min % 60}m`;
  return `Ends in ${min} min`;
}

function relativeLabel(highlight: EventHighlight, start: Date, end: Date | null, nowMs: number): string | null {
  if (highlight === 'upcoming') return startsIn(start.getTime() - nowMs);
  if (highlight === 'ongoing') return endsIn(end, nowMs);
  return null;
}

export function scheduleContext(ev: Event, nowMs: number) {
  const start = new Date(ev.startAt);
  const end = ev.endAt ? new Date(ev.endAt) : null;
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const highlight = getEventHighlight(ev, nowMs);
  return {
    weekday: start.toLocaleDateString(undefined, { weekday: 'long' }),
    dateLine: start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    timeLine: end ? `${time(start)} – ${time(end)}` : time(start),
    durationLabel: durationLabel(start, end),
    relative: relativeLabel(highlight, start, end, nowMs),
    highlight,
  };
}

export type ScheduleContext = ReturnType<typeof scheduleContext>;
