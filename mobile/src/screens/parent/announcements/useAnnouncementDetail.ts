import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import { markAnnouncementNotificationsRead } from '../../../services/inAppNotifications';
import { toIso } from '../../../utils';
import type { Announcement } from '@shared/types';

function normalizeAnnouncement(id: string, schoolId: string, data: Record<string, unknown>): Announcement {
  const optional = (v: unknown) => (v != null ? String(v) : undefined);
  return {
    id,
    schoolId: String(data.schoolId ?? schoolId),
    title: String(data.title ?? 'Announcement'),
    body: data.body != null ? String(data.body) : '',
    imageUrl: optional(data.imageUrl),
    mediaType: optional(data.mediaType),
    documents: data.documents as Announcement['documents'],
    links: data.links as Announcement['links'],
    createdBy: String(data.createdBy ?? ''),
    createdAt: toIso(data.createdAt),
    targetType: data.targetType as Announcement['targetType'],
    targetClassIds: data.targetClassIds as Announcement['targetClassIds'],
    targetTeacherIds: data.targetTeacherIds as Announcement['targetTeacherIds'],
    targetRole: data.targetRole as Announcement['targetRole'],
    reminderSentAt: data.reminderSentAt != null ? toIso(data.reminderSentAt) : undefined,
  };
}

function shareMessage(a: Announcement) {
  const urls = [a.imageUrl, ...(a.documents ?? []).map((d) => d.url), ...(a.links ?? []).map((l) => l.url)].filter(Boolean);
  return [a.title, a.body?.trim(), ...urls].filter(Boolean).join('\n\n');
}

export function useAnnouncementDetail(schoolId: string, announcementId: string) {
  const { profile } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAnnouncement(null);
    return onSnapshot(
      doc(db, 'schools', schoolId, 'announcements', announcementId),
      (snap) => {
        setAnnouncement(snap.exists() ? normalizeAnnouncement(snap.id, schoolId, snap.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      () => {
        setAnnouncement(null);
        setLoading(false);
      }
    );
  }, [schoolId, announcementId]);

  const loaded = !!announcement;
  useEffect(() => {
    if (profile?.uid && loaded) void markAnnouncementNotificationsRead(profile.uid, announcementId);
  }, [profile?.uid, announcementId, loaded]);

  const share = useCallback(() => {
    if (announcement) Share.share({ message: shareMessage(announcement) }).catch(() => {});
  }, [announcement]);

  return { announcement, loading, share };
}
