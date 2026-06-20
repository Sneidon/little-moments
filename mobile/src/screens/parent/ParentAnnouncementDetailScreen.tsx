import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { markAnnouncementNotificationsRead } from '../../services/inAppNotifications';
import { font } from '../../theme/typography';
import type { Announcement } from '../../../../shared/types';
import { isVideoMedia } from '../../utils/media';

type Params = { schoolId: string; announcementId: string };

type Props = NativeStackScreenProps<{ ParentAnnouncementDetail: Params }, 'ParentAnnouncementDetail'>;

function toIso(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

function normalizeAnnouncement(id: string, schoolIdParam: string, data: Record<string, unknown>): Announcement {
  return {
    id,
    schoolId: String(data.schoolId ?? schoolIdParam),
    title: String(data.title ?? 'Announcement'),
    body: data.body != null ? String(data.body) : '',
    imageUrl: data.imageUrl != null ? String(data.imageUrl) : undefined,
    mediaType: data.mediaType != null ? String(data.mediaType) : undefined,
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

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url);
}

function docIcon(url: string): keyof typeof Ionicons.glyphMap {
  if (/\.pdf(\?|#|$)/i.test(url)) return 'document-text-outline';
  if (isLikelyImageUrl(url)) return 'image-outline';
  return 'attach-outline';
}

function formatPostedAt(iso: string): { dateLine: string; timeLine: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateLine: '', timeLine: '' };
  return {
    dateLine: d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    timeLine: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

export function ParentAnnouncementDetailScreen({ route, navigation }: Props) {
  const { schoolId, announcementId } = route.params;
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroIntrinsic, setHeroIntrinsic] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setHeroLoaded(false);
    setHeroIntrinsic(null);
  }, [announcementId, announcement?.imageUrl]);

  useEffect(() => {
    setLoading(true);
    setMissing(false);
    setAnnouncement(null);
    const ref = doc(db, 'schools', schoolId, 'announcements', announcementId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setAnnouncement(null);
          setMissing(true);
          setLoading(false);
          return;
        }
        setAnnouncement(normalizeAnnouncement(snap.id, schoolId, snap.data() as Record<string, unknown>));
        setMissing(false);
        setLoading(false);
      },
      () => {
        setAnnouncement(null);
        setMissing(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [schoolId, announcementId]);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid || !announcement) return;
    void markAnnouncementNotificationsRead(uid, announcementId);
  }, [profile?.uid, announcementId, announcement]);

  const onShare = useCallback(() => {
    if (!announcement) return;
    const lines: string[] = [announcement.title];
    if (announcement.body?.trim()) lines.push(announcement.body.trim());
    const urls = [
      ...(announcement.imageUrl ? [announcement.imageUrl] : []),
      ...(announcement.documents?.map((d) => d.url).filter(Boolean) as string[]),
      ...(announcement.links?.map((l) => l.url).filter(Boolean) as string[]),
    ];
    if (urls.length) lines.push(...urls);
    Share.share({ message: lines.join('\n\n') }).catch(() => {});
  }, [announcement]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={onShare}
          style={styles.headerIconBtn}
          disabled={!announcement}
          accessibilityRole="button"
          accessibilityLabel="Share announcement"
        >
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, onShare, announcement, colors.primary, styles.headerIconBtn]);

  const heroWidth = width - 32;
  const heroHeight = useMemo(() => {
    if (!heroIntrinsic) return 220;
    const { w, h } = heroIntrinsic;
    if (w <= 0 || h <= 0) return 220;
    const raw = (heroWidth * h) / w;
    return Math.round(Math.min(Math.max(raw, 180), 520));
  }, [heroIntrinsic, heroWidth]);
  const bottomPad = insets.bottom + 24;

  const imageAttachments =
    announcement?.documents?.filter((d) => d.url && isLikelyImageUrl(d.url)) ?? [];
  const fileAttachments =
    announcement?.documents?.filter((d) => d.url && !isLikelyImageUrl(d.url)) ?? [];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingHint, { color: colors.textMuted }]}>Loading announcement…</Text>
      </View>
    );
  }

  if (missing || !announcement) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary, padding: 24 }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="megaphone-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.errorTitle}>We couldn&apos;t load this announcement</Text>
        <Text style={styles.errorBody}>
          It may have been removed, or there was a connection problem. Try again from the announcements list.
        </Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const a = announcement;
  const posted = formatPostedAt(a.createdAt);

  const summaryCard = (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name="megaphone-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.pillText, { color: colors.primary }]}>School announcement</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {a.title}
      </Text>
      {posted.dateLine ? (
        <View style={[styles.metaRow, { borderTopColor: colors.cardBorder }]}>
          <View style={[styles.metaIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.metaBody}>
            <Text style={[styles.metaDate, { color: colors.text }]}>{posted.dateLine}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.metaTime, { color: colors.textSecondary }]}>{posted.timeLine}</Text>
            </View>
          </View>
        </View>
      ) : null}
      {a.targetType === 'classes' ? (
        <View style={[styles.audienceRow, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="people-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <Text style={[styles.audienceText, { color: colors.textMuted }]}>
            Shared with specific classes at the school
          </Text>
        </View>
      ) : null}
    </View>
  );

  const heroBlock =
    a.imageUrl ? (
      <View style={[styles.heroCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
        <View style={[styles.heroImageWrap, { width: heroWidth, height: heroHeight }]}>
          {isVideoMedia(a.mediaType, a.imageUrl) ? (
            <TouchableOpacity
              style={[styles.heroImage, styles.heroVideoWrap]}
              onPress={() => Linking.openURL(a.imageUrl!)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open video"
            >
              <View style={styles.heroVideoPlay}>
                <Ionicons name="play-circle" size={56} color={colors.primary} />
              </View>
              <Text style={[styles.heroVideoLabel, { color: colors.textSecondary }]}>Tap to open video</Text>
            </TouchableOpacity>
          ) : (
            <>
              {!heroLoaded ? (
                <View style={styles.heroLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
              <Image
                source={{ uri: a.imageUrl }}
                style={[styles.heroImage, { opacity: heroLoaded ? 1 : 0 }]}
                resizeMode="contain"
                onLoad={(e) => {
                  const src = e.nativeEvent?.source;
                  if (src?.width && src?.height) {
                    setHeroIntrinsic({ w: src.width, h: src.height });
                  }
                  setHeroLoaded(true);
                }}
                onError={() => setHeroLoaded(true)}
              />
            </>
          )}
        </View>
      </View>
    ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {a.imageUrl ? (
          <>
            {heroBlock}
            {summaryCard}
          </>
        ) : (
          summaryCard
        )}

        {a.body?.trim() ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Message</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{a.body}</Text>
          </View>
        ) : null}

        {imageAttachments.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Photos & images</Text>
            {imageAttachments.map((d, i) =>
              d.url ? (
                <TouchableOpacity
                  key={`img-doc-${i}`}
                  activeOpacity={0.9}
                  onPress={() => Linking.openURL(d.url)}
                  style={[styles.inlineImageCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                >
                  <Image
                    source={{ uri: d.url }}
                    style={[styles.inlineImage, { width: heroWidth - 2 }]}
                    resizeMode="cover"
                  />
                  <Text style={[styles.inlineImageCaption, { color: colors.textSecondary }]} numberOfLines={2}>
                    {d.label || d.name || 'Image'}
                  </Text>
                </TouchableOpacity>
              ) : null
            )}
          </>
        ) : null}

        {fileAttachments.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Files & documents</Text>
            {fileAttachments.map((d, i) =>
              d.url ? (
                <TouchableOpacity
                  key={`doc-${i}`}
                  style={[styles.linkRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                  onPress={() => Linking.openURL(d.url)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${d.label || d.name || 'document'}`}
                >
                  <View style={[styles.linkIconWrap, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name={docIcon(d.url)} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={2}>
                    {d.label || d.name || 'Attachment'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null
            )}
          </>
        ) : null}

        {a.links && a.links.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Links</Text>
            {a.links.map((d, i) =>
              d.url ? (
                <TouchableOpacity
                  key={`link-${i}`}
                  style={[styles.linkRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                  onPress={() => Linking.openURL(d.url)}
                  activeOpacity={0.75}
                  accessibilityRole="link"
                >
                  <View style={[styles.linkIconWrap, { backgroundColor: colors.accentTealSoft }]}>
                    <Ionicons name="link-outline" size={20} color={colors.accentTeal} />
                  </View>
                  <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={2}>
                    {d.label || d.name || d.url}
                  </Text>
                  <Ionicons name="open-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });

  return StyleSheet.create({
    screen: { flex: 1 },
    headerIconBtn: { marginRight: 8, padding: 6 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingHint: { marginTop: 14, fontSize: 15, ...f('medium') },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
    summaryCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 1 } : {}),
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 12,
    },
    pillText: { fontSize: 12, ...f('semiBold') },
    title: { fontSize: 22, ...f('bold'), lineHeight: 28, letterSpacing: -0.3 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    metaIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    metaBody: { flex: 1, minWidth: 0 },
    metaDate: { fontSize: 16, ...f('semiBold') },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    metaTime: { fontSize: 14, ...f('regular') },
    audienceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
    },
    audienceText: { fontSize: 13, lineHeight: 18, flex: 1, ...f('regular') },
    heroCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 14,
    },
    heroImageWrap: {
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroLoading: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    heroImage: {
      width: '100%',
      height: '100%',
      borderRadius: 0,
    },
    heroVideoWrap: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    heroVideoPlay: {
      marginBottom: 8,
    },
    heroVideoLabel: {
      fontSize: 14,
      ...f('medium'),
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    heroFooterText: { fontSize: 12, ...f('medium') },
    sectionCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      ...f('semiBold'),
      marginBottom: 10,
    },
    body: { fontSize: 16, lineHeight: 24, ...f('regular') },
    sectionLabel: {
      fontSize: 12,
      letterSpacing: 0.5,
      ...f('semiBold'),
      marginTop: 4,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    inlineImageCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 12,
    },
    inlineImage: {
      height: 180,
    },
    inlineImageCaption: { fontSize: 13, padding: 12, ...f('medium') },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
    },
    linkIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    linkText: { flex: 1, fontSize: 15, ...f('semiBold') },
    errorIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorTitle: {
      fontSize: 19,
      ...f('bold'),
      color: colors.text,
      marginTop: 20,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    errorBody: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
      ...f('regular'),
      paddingHorizontal: 8,
    },
    backBtn: {
      marginTop: 24,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      borderWidth: 1,
    },
    backBtnText: { ...f('semiBold'), fontSize: 16 },
  });
}
