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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { Event } from '../../../../shared/types';
import { formatEventTimeRange, getEventHighlight } from './calendarUtils';

type ParentEventDetailParams = { schoolId: string; eventId: string };

type Props = NativeStackScreenProps<{ ParentEventDetail: ParentEventDetailParams }, 'ParentEventDetail'>;

function toIso(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

function normalizeEvent(id: string, data: Record<string, unknown>): Event {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    title: String(data.title ?? 'Event'),
    description: data.description != null ? String(data.description) : undefined,
    imageUrl: data.imageUrl != null ? String(data.imageUrl) : undefined,
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

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url);
}

function docIcon(url: string): keyof typeof Ionicons.glyphMap {
  if (/\.pdf(\?|#|$)/i.test(url)) return 'document-text-outline';
  if (isLikelyImageUrl(url)) return 'image-outline';
  return 'attach-outline';
}

/** Readable schedule + optional countdown / “ends in” for parents. */
function scheduleContext(ev: Event, nowMs: number) {
  const start = new Date(ev.startAt);
  const end = ev.endAt ? new Date(ev.endAt) : null;
  const weekday = start.toLocaleDateString(undefined, { weekday: 'long' });
  const dateLine = start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStart = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const timeEnd = end ? end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
  const timeLine = timeEnd ? `${timeStart} – ${timeEnd}` : `${timeStart}`;

  let durationLabel: string | null = null;
  if (end) {
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0 && m > 0) durationLabel = `${h} hr ${m} min`;
      else if (h > 0) durationLabel = `${h} hour${h === 1 ? '' : 's'}`;
      else durationLabel = `${m} min`;
    }
  }

  const highlight = getEventHighlight(ev, nowMs);
  let relative: string | null = null;
  let relativeTone: 'primary' | 'success' = 'primary';

  if (highlight === 'upcoming') {
    relativeTone = 'primary';
    const diff = start.getTime() - nowMs;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days >= 1) relative = `Starts in ${days} day${days === 1 ? '' : 's'}`;
    else if (hours >= 1) relative = `Starts in about ${hours} hour${hours === 1 ? '' : 's'}`;
    else {
      const min = Math.max(1, Math.floor(diff / 60000));
      relative = min >= 60 ? `Starts in ${Math.floor(min / 60)}h ${min % 60}m` : `Starts in ${min} min`;
    }
  } else if (highlight === 'ongoing') {
    relativeTone = 'success';
    if (end) {
      const diff = end.getTime() - nowMs;
      if (diff > 0) {
        const min = Math.max(1, Math.floor(diff / 60000));
        if (min >= 120) relative = `Ends in ${Math.floor(min / 60)} hours`;
        else if (min >= 60) relative = `Ends in ${Math.floor(min / 60)}h ${min % 60}m`;
        else relative = `Ends in ${min} min`;
      } else relative = 'Ending soon';
    } else relative = 'In progress';
  }

  return { weekday, dateLine, timeLine, durationLabel, relative, relativeTone, highlight };
}

export function ParentEventDetailScreen({ route, navigation }: Props) {
  const { schoolId, eventId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [rsvpPending, setRsvpPending] = useState<'accepted' | 'declined' | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroIntrinsic, setHeroIntrinsic] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setHeroLoaded(false);
    setHeroIntrinsic(null);
  }, [event?.imageUrl]);

  useEffect(() => {
    const ref = doc(db, 'schools', schoolId, 'events', eventId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setMissing(true);
          setEvent(null);
          return;
        }
        setMissing(false);
        setEvent(normalizeEvent(snap.id, snap.data() as Record<string, unknown>));
      },
      () => {
        setLoading(false);
        setMissing(true);
      }
    );
    return () => unsub();
  }, [schoolId, eventId]);

  const shareEvent = useCallback(async () => {
    if (!event) return;
    const when = formatEventTimeRange(event);
    const lines = [event.title, when, event.description ? event.description.slice(0, 280) : ''].filter(Boolean);
    try {
      await Share.share({
        title: event.title,
        message: lines.join('\n\n'),
      });
    } catch {
      /* user dismissed */
    }
  }, [event]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: event?.title ?? 'Event',
      headerRight:
        event && !missing
          ? () => (
              <TouchableOpacity
                onPress={shareEvent}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerIconBtn}
                accessibilityLabel="Share event"
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [event?.title, event, missing, navigation, shareEvent, colors.primary, styles.headerIconBtn]);

  const respond = useCallback(
    async (response: 'accepted' | 'declined') => {
      if (!profile?.uid || !event) return;
      setRsvpPending(response);
      try {
        const ref = doc(db, 'schools', schoolId, 'events', eventId);
        await updateDoc(ref, { [`parentResponses.${profile.uid}`]: response });
      } finally {
        setRsvpPending(null);
      }
    },
    [profile?.uid, event, schoolId, eventId]
  );

  const imageAttachments =
    event?.documents?.filter((d) => d.url && isLikelyImageUrl(d.url)) ?? [];
  const fileAttachments =
    event?.documents?.filter((d) => d.url && !isLikelyImageUrl(d.url)) ?? [];

  const heroWidth = width - 32;
  const heroHeight = useMemo(() => {
    if (!heroIntrinsic) return 220;
    const { w, h } = heroIntrinsic;
    if (w <= 0 || h <= 0) return 220;
    const raw = (heroWidth * h) / w;
    return Math.round(Math.min(Math.max(raw, 180), 520));
  }, [heroIntrinsic, heroWidth]);
  const bottomPad = insets.bottom + (event && getEventHighlight(event, nowMs) !== 'past' && profile?.uid ? 132 : 28);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingHint, { color: colors.textMuted }]}>Loading event…</Text>
      </View>
    );
  }

  if (missing || !event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary, padding: 24 }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="calendar-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.errorTitle}>We couldn&apos;t load this event</Text>
        <Text style={styles.errorBody}>
          It may have been removed, or there was a connection problem. Check your internet and try opening it again from
          the calendar.
        </Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Back to calendar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ctx = scheduleContext(event, nowMs);
  const myRsvp = profile?.uid ? event.parentResponses?.[profile.uid] : undefined;
  const rsvpOpen = ctx.highlight !== 'past';

  const statusPill =
    ctx.highlight === 'past' ? (
      <View style={[styles.statusPill, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="archive-outline" size={15} color={colors.textMuted} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: colors.textMuted }]}>Past event</Text>
      </View>
    ) : ctx.highlight === 'ongoing' ? (
      <View style={[styles.statusPill, { backgroundColor: colors.accentTealSoft }]}>
        <Ionicons name="radio-button-on" size={15} color={colors.success} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: colors.success }]}>Happening now</Text>
      </View>
    ) : (
      <View style={[styles.statusPill, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name="arrow-forward-circle-outline" size={15} color={colors.primary} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: colors.primary }]}>Upcoming</Text>
      </View>
    );

  const relativeColors =
    ctx.relativeTone === 'success'
      ? { bg: colors.accentTealSoft, fg: colors.success }
      : ctx.relativeTone === 'muted'
        ? { bg: colors.backgroundSecondary, fg: colors.textMuted }
        : { bg: colors.primaryMuted, fg: colors.primary };

  const summaryCard = (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {statusPill}
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {event.title}
      </Text>
      {ctx.relative ? (
        <View style={[styles.relativeBanner, { backgroundColor: relativeColors.bg }]}>
          <Ionicons
            name={ctx.highlight === 'ongoing' ? 'time-outline' : 'hourglass-outline'}
            size={16}
            color={relativeColors.fg}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.relativeText, { color: relativeColors.fg }]}>{ctx.relative}</Text>
        </View>
      ) : null}

      <View style={[styles.scheduleRow, { borderTopColor: colors.cardBorder }]}>
        <View style={[styles.scheduleIconCircle, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="calendar" size={22} color={colors.primary} />
        </View>
        <View style={styles.scheduleBody}>
          <Text style={[styles.scheduleWeekday, { color: colors.text }]}>{ctx.weekday}</Text>
          <Text style={[styles.scheduleDate, { color: colors.textSecondary }]}>{ctx.dateLine}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.scheduleTime, { color: colors.primary }]}>{ctx.timeLine}</Text>
            {ctx.durationLabel ? (
              <View style={[styles.durationChip, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.durationChipText, { color: colors.textSecondary }]}>{ctx.durationLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {event.targetType === 'classes' ? (
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
    event.imageUrl ? (
      <View style={[styles.heroCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
        <View style={[styles.heroImageWrap, { width: heroWidth, height: heroHeight }]}>
          {!heroLoaded ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}
          <Image
            source={{ uri: event.imageUrl }}
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
        {event.imageUrl ? (
          <>
            {heroBlock}
            {summaryCard}
          </>
        ) : (
          summaryCard
        )}

        {event.description ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>About</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{event.description}</Text>
          </View>
        ) : null}

        {imageAttachments.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>More photos</Text>
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
                    {d.label || d.name || 'Photo'}
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
                  accessibilityLabel={`Open ${d.label || d.name || 'attachment'}`}
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

        {event.links && event.links.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Links</Text>
            {event.links.map((d, i) =>
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

        {!rsvpOpen && profile?.uid ? (
          <View style={[styles.pastRsvpCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <View style={styles.pastRsvpHeader}>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.pastRsvpLabel, { color: colors.textMuted }]}>Your RSVP</Text>
            </View>
            <Text style={[styles.pastRsvpValue, { color: colors.text }]}>
              {myRsvp === 'accepted' ? 'You were marked as going' : myRsvp === 'declined' ? 'You were marked as not going' : 'No reply was saved'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {rsvpOpen && profile?.uid ? (
        <View
          style={[
            styles.rsvpBar,
            {
              borderTopColor: colors.cardBorder,
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.rsvpAccent, { backgroundColor: colors.primary }]} />
          {myRsvp ? (
            <Text style={[styles.rsvpSummary, { color: colors.textMuted }]}>
              You&apos;re {myRsvp === 'accepted' ? 'going' : 'not going'}. Tap below to update.
            </Text>
          ) : (
            <Text style={[styles.rsvpSummary, { color: colors.text }]}>Will your child attend?</Text>
          )}
          <View style={styles.rsvpActions}>
            <TouchableOpacity
              style={[
                styles.rsvpPrimary,
                { backgroundColor: colors.success },
                myRsvp === 'accepted' && styles.rsvpSelectedPrimary,
                rsvpPending != null && styles.disabled,
              ]}
              onPress={() => respond('accepted')}
              disabled={rsvpPending != null}
              activeOpacity={0.85}
            >
              {rsvpPending === 'accepted' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={myRsvp === 'accepted' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={20}
                    color="#fff"
                    style={styles.rsvpIcon}
                  />
                  <Text style={styles.rsvpPrimaryText}>{myRsvp === 'accepted' ? 'Going' : "We're going"}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rsvpSecondary,
                { borderColor: colors.cardBorder, backgroundColor: colors.backgroundSecondary },
                myRsvp === 'declined' && { borderColor: colors.danger, backgroundColor: colors.dangerMuted },
                rsvpPending != null && styles.disabled,
              ]}
              onPress={() => respond('declined')}
              disabled={rsvpPending != null}
              activeOpacity={0.85}
            >
              {rsvpPending === 'declined' ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons
                    name={myRsvp === 'declined' ? 'close-circle' : 'close-circle-outline'}
                    size={20}
                    color={myRsvp === 'declined' ? colors.danger : colors.textMuted}
                    style={styles.rsvpIcon}
                  />
                  <Text
                    style={[
                      styles.rsvpSecondaryText,
                      { color: myRsvp === 'declined' ? colors.danger : colors.text },
                    ]}
                  >
                    {myRsvp === 'declined' ? "Can't go" : "Can't make it"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });

  return StyleSheet.create({
    screen: { flex: 1 },
    headerIconBtn: { marginRight: 4, padding: 4 },
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
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      marginBottom: 12,
    },
    statusIcon: { marginRight: 6 },
    statusText: { fontSize: 13, ...f('semiBold') },
    title: { fontSize: 24, ...f('bold'), lineHeight: 30, letterSpacing: -0.3 },
    relativeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    relativeText: { fontSize: 14, ...f('semiBold'), flex: 1 },
    scheduleRow: {
      flexDirection: 'row',
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    scheduleIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    scheduleBody: { flex: 1, minWidth: 0 },
    scheduleWeekday: { fontSize: 17, ...f('bold') },
    scheduleDate: { fontSize: 15, marginTop: 2, ...f('regular') },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 10,
    },
    scheduleTime: { fontSize: 16, ...f('semiBold') },
    durationChip: {
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    durationChipText: { fontSize: 12, ...f('semiBold') },
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
    pastRsvpCard: {
      marginTop: 8,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
    pastRsvpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pastRsvpLabel: { fontSize: 12, ...f('semiBold'), textTransform: 'uppercase' },
    pastRsvpValue: { fontSize: 16, lineHeight: 22, ...f('semiBold') },
    rsvpBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 14,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 10 } : {}),
    },
    rsvpAccent: { height: 3, width: 40, borderRadius: 2, alignSelf: 'center', marginBottom: 10, opacity: 0.35 },
    rsvpSummary: { fontSize: 13, textAlign: 'center', marginBottom: 12, ...f('regular') },
    rsvpActions: { flexDirection: 'row', gap: 10 },
    rsvpPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
    },
    rsvpSelectedPrimary: {
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    rsvpPrimaryText: { color: '#FFFFFF', ...f('semiBold'), fontSize: 15 },
    rsvpSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    rsvpSecondaryText: { ...f('semiBold'), fontSize: 15 },
    rsvpIcon: { marginRight: 6 },
    disabled: { opacity: 0.55 },
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
