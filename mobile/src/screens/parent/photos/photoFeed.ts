import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Child, DailyReport } from '@shared/types';

const REPORTS_PER_CHILD = 100;

export type PhotoFeedItem = {
  key: string;
  schoolId: string;
  childId: string;
  reportId: string;
  imageUrl: string;
  mediaType?: string;
  timestamp: string;
  childName: string;
  childPhotoURL?: string;
  notes?: string;
  photoCategory?: string;
  forWholeClass?: boolean;
};

export function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toFeedItem(child: Child, reportId: string, data: DailyReport): PhotoFeedItem | null {
  const imageUrl = data.imageUrl?.trim();
  if (data.type !== 'incident' || !imageUrl) return null;
  const timestamp = typeof data.timestamp === 'string' ? data.timestamp : typeof data.createdAt === 'string' ? data.createdAt : '';
  return {
    key: `${child.schoolId}-${child.id}-${reportId}`,
    schoolId: child.schoolId,
    childId: child.id,
    reportId,
    imageUrl,
    mediaType: data.mediaType,
    timestamp,
    childName: child.preferredName?.trim() || child.name,
    childPhotoURL: child.photoURL,
    notes: data.notes?.trim() || undefined,
    photoCategory: data.photoCategory?.trim() || undefined,
    forWholeClass: data.forWholeClass === true,
  };
}

async function fetchChildPhotos(child: Child): Promise<PhotoFeedItem[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'schools', child.schoolId, 'children', child.id, 'reports'), orderBy('timestamp', 'desc'), limit(REPORTS_PER_CHILD))
    );
    return snap.docs.flatMap((d) => toFeedItem(child, d.id, d.data() as DailyReport) ?? []);
  } catch {
    // A child's reports can fail on permissions or a missing index; show the rest.
    return [];
  }
}

export async function fetchPhotoFeed(children: Child[]): Promise<PhotoFeedItem[]> {
  const perChild = await Promise.all(children.map(fetchChildPhotos));
  return perChild.flat().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}
