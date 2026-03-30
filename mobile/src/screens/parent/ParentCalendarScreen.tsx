import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import type { Event } from '../../../../shared/types';
import {
  toLocalYMD,
  indexEventsByDay,
  getMonthGrid,
  startOfWeekSunday,
  addDays,
  eventsInWeek,
  groupEventsByDayKeys,
  getEventHighlight,
  getDayHighlightLevel,
  getUpcomingAndOngoingEvents,
  formatEventTimeRange,
} from './calendarUtils';

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ParentCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [list, setList] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byDay = useMemo(() => indexEventsByDay(list), [list]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    (async () => {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSchoolId(schoolDoc.id);
          break;
        }
      }
    })();
  }, [profile?.uid, refreshTrigger]);

  useEffect(() => {
    if (!schoolId) return;
    const q = query(collection(db, 'schools', schoolId, 'events'), orderBy('startAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
      setRefreshing(false);
    });
    return () => unsub();
  }, [schoolId, refreshTrigger]);

  const year = cursorDate.getFullYear();
  const monthIndex = cursorDate.getMonth();
  const monthGrid = useMemo(() => getMonthGrid(year, monthIndex), [year, monthIndex]);
  const weekStart = useMemo(() => startOfWeekSunday(cursorDate), [cursorDate]);
  const weekEventsList = useMemo(() => eventsInWeek(list, weekStart), [list, weekStart]);
  const weekGrouped = useMemo(
    () => groupEventsByDayKeys(weekEventsList, weekStart),
    [weekEventsList, weekStart]
  );
  const dayEvents = useMemo(() => byDay.get(toLocalYMD(cursorDate)) ?? [], [byDay, cursorDate]);
  const upcomingPreview = useMemo(() => getUpcomingAndOngoingEvents(list, nowMs, 6), [list, nowMs]);
  const upcomingTotal = useMemo(
    () => list.filter((ev) => getEventHighlight(ev, nowMs) !== 'past').length,
    [list, nowMs]
  );

  const cellW = (width - 32) / 7;

  const goMonthPrev = () => setCursorDate(new Date(year, monthIndex - 1, 1));
  const goMonthNext = () => setCursorDate(new Date(year, monthIndex + 1, 1));
  const goWeekPrev = () => setCursorDate(addDays(cursorDate, -7));
  const goWeekNext = () => setCursorDate(addDays(cursorDate, 7));
  const goDayPrev = () => setCursorDate(addDays(cursorDate, -1));
  const goDayNext = () => setCursorDate(addDays(cursorDate, 1));

  const monthTitle = cursorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekTitle = `${addDays(weekStart, 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const dayTitle = cursorDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const openEvent = (ev: Event) => {
    if (!schoolId) return;
    const root = navigation.getParent() as { navigate: (n: string, p: object) => void } | undefined;
    root?.navigate('ParentEventDetail', { schoolId, eventId: ev.id });
  };

  const dotColorForEvent = (ev: Event) => {
    const h = getEventHighlight(ev, nowMs);
    if (h === 'upcoming') return colors.primary;
    if (h === 'ongoing') return colors.success;
    return colors.textMuted;
  };

  const renderEventBadge = (ev: Event) => {
    const h = getEventHighlight(ev, nowMs);
    if (h === 'past') return null;
    return (
      <View
        style={[
          styles.eventBadge,
          h === 'ongoing' ? { backgroundColor: colors.accentTealSoft } : { backgroundColor: colors.primaryMuted },
        ]}
      >
        <Ionicons
          name={h === 'ongoing' ? 'radio-button-on' : 'time-outline'}
          size={12}
          color={h === 'ongoing' ? colors.accentTeal : colors.primary}
          style={{ marginRight: 4 }}
        />
        <Text
          style={[
            styles.eventBadgeText,
            { color: h === 'ongoing' ? colors.accentTeal : colors.primary },
          ]}
        >
          {h === 'ongoing' ? 'Happening now' : 'Upcoming'}
        </Text>
      </View>
    );
  };

  const renderViewToggle = () => (
    <View style={styles.toggleRow}>
      {(['month', 'week', 'day'] as const).map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.togglePill, viewMode === m && styles.togglePillActive]}
          onPress={() => setViewMode(m)}
          activeOpacity={0.85}
        >
          <Text style={[styles.toggleText, viewMode === m && styles.toggleTextActive]}>
            {m === 'month' ? 'Month' : m === 'week' ? 'Week' : 'Day'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUpcomingPreview = () => (
    <View style={[styles.card, styles.upcomingCard]}>
      <View style={styles.upcomingHeader}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.upcomingHeaderTitle}>Upcoming</Text>
        {upcomingTotal > 0 ? <Text style={styles.upcomingHeaderCount}>{upcomingTotal}</Text> : null}
      </View>
      {upcomingPreview.length === 0 ? (
        <Text style={styles.upcomingEmpty}>No upcoming events scheduled.</Text>
      ) : (
        <View style={styles.upcomingList}>
          {upcomingPreview.map((ev) => {
            const h = getEventHighlight(ev, nowMs);
            const dot = h === 'ongoing' ? colors.success : colors.primary;
            return (
              <TouchableOpacity
                key={ev.id}
                style={[styles.upcomingRow, { borderColor: colors.cardBorder }]}
                onPress={() => openEvent(ev)}
                activeOpacity={0.75}
              >
                <View style={[styles.upcomingDot, { backgroundColor: dot }]} />
                <View style={styles.upcomingRowBody}>
                  <Text style={styles.upcomingRowTitle} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text style={styles.upcomingRowMeta} numberOfLines={1}>
                    {h === 'ongoing' ? 'Now · ' : ''}
                    {formatEventTimeRange(ev)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {upcomingTotal > upcomingPreview.length ? (
        <Text style={styles.upcomingMoreHint}>Showing {upcomingPreview.length} of {upcomingTotal} — browse the calendar for the rest.</Text>
      ) : null}
    </View>
  );

  const renderMonth = () => (
    <View style={styles.card}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goMonthPrev} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{monthTitle}</Text>
        <TouchableOpacity onPress={goMonthNext} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={[styles.weekdayCell, { width: cellW }]}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>
      {monthGrid.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((day, ci) => {
            if (day == null) {
              return <View key={`e-${ci}`} style={[styles.dayCell, { width: cellW }]} />;
            }
            const d = new Date(year, monthIndex, day);
            const ymd = toLocalYMD(d);
            const evs = byDay.get(ymd) ?? [];
            const isToday = ymd === toLocalYMD(new Date());
            const isSelected = ymd === toLocalYMD(cursorDate);
            const dayLevel = getDayHighlightLevel(evs, nowMs);
            return (
              <TouchableOpacity
                key={ymd}
                style={[
                  styles.dayCell,
                  { width: cellW },
                  dayLevel === 'ongoing' && [
                    styles.dayCellHighlight,
                    { borderColor: colors.success, backgroundColor: colors.accentTealSoft },
                  ],
                  dayLevel === 'upcoming' && [
                    styles.dayCellHighlight,
                    { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
                  ],
                  dayLevel === 'past_only' && evs.length > 0 && styles.dayCellPastOnly,
                  isToday && dayLevel === 'empty' && styles.dayCellToday,
                  isToday && dayLevel === 'past_only' && styles.dayCellToday,
                  isSelected && viewMode === 'month' && styles.dayCellSelected,
                ]}
                onPress={() => {
                  setCursorDate(d);
                  if (evs.length === 1) openEvent(evs[0]);
                  else setViewMode('day');
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isToday && styles.dayNumToday,
                    isSelected && styles.dayNumSelected,
                    dayLevel === 'ongoing' && { color: colors.success, fontFamily: font.bold },
                    dayLevel === 'upcoming' && !isSelected && { color: colors.primary, fontFamily: font.semiBold },
                  ]}
                >
                  {day}
                </Text>
                {evs.length > 0 ? (
                  <View style={styles.dotRow}>
                    {evs.slice(0, 3).map((ev) => (
                      <View
                        key={ev.id}
                        style={[
                          styles.eventDot,
                          getEventHighlight(ev, nowMs) !== 'past' && styles.eventDotBright,
                          { backgroundColor: dotColorForEvent(ev) },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.dotRow} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderWeek = () => (
    <View style={styles.card}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goWeekPrev} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, styles.navTitleShrink]} numberOfLines={1}>
          {weekTitle}
        </Text>
        <TouchableOpacity onPress={goWeekNext} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(weekStart, i);
          const ymd = toLocalYMD(d);
          const evs = byDay.get(ymd) ?? [];
          const isSel = ymd === toLocalYMD(cursorDate);
          const isToday = ymd === toLocalYMD(new Date());
          const wLevel = getDayHighlightLevel(evs, nowMs);
          const dotColor =
            wLevel === 'ongoing'
              ? colors.success
              : wLevel === 'upcoming'
                ? colors.primary
                : evs.length > 0
                  ? colors.textMuted
                  : 'transparent';
          return (
            <TouchableOpacity
              key={ymd}
              style={[
                styles.weekDayChip,
                { borderColor: colors.cardBorder },
                wLevel === 'ongoing' && { borderColor: colors.success, borderWidth: 2, backgroundColor: colors.accentTealSoft },
                wLevel === 'upcoming' && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryMuted },
                isSel && styles.weekDayChipSelected,
              ]}
              onPress={() => {
                setCursorDate(d);
                setViewMode('day');
              }}
            >
              <Text
                style={[
                  styles.weekDayName,
                  isToday && { color: colors.primary },
                  wLevel === 'ongoing' && { color: colors.success },
                  wLevel === 'upcoming' && { color: colors.primary },
                ]}
              >
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.weekDayNum,
                  isSel && { color: colors.primary },
                  wLevel === 'ongoing' && { color: colors.success },
                  wLevel === 'upcoming' && { color: colors.primary },
                ]}
              >
                {d.getDate()}
              </Text>
              {evs.length > 0 ? (
                <View style={styles.weekDotWrap}>
                  <View style={[styles.weekDot, { backgroundColor: dotColor }]} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.sectionLabel}>This week</Text>
      {weekGrouped.map(({ ymd, label, events: evs }) =>
        evs.length ? (
          <View key={ymd} style={styles.weekSection}>
            <Text style={styles.weekSectionTitle}>{label}</Text>
            {evs.map((ev) => {
              const h = getEventHighlight(ev, nowMs);
              const bar =
                h === 'upcoming' ? colors.primary : h === 'ongoing' ? colors.success : colors.textMuted;
              const bg =
                h === 'upcoming'
                  ? colors.primaryMuted
                  : h === 'ongoing'
                    ? colors.accentTealSoft
                    : colors.backgroundSecondary;
              const border =
                h === 'upcoming' ? colors.primary : h === 'ongoing' ? colors.success : colors.cardBorder;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.eventRow,
                    { borderColor: border, backgroundColor: bg },
                    h !== 'past' && styles.eventRowElevated,
                  ]}
                  onPress={() => openEvent(ev)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.eventRowBar, { backgroundColor: bar }]} />
                  <View style={styles.eventRowBody}>
                    <View style={styles.eventRowTitleRow}>
                      <Text
                        style={[styles.eventRowTitle, h === 'past' && styles.eventRowTitlePast]}
                        numberOfLines={2}
                      >
                        {ev.title}
                      </Text>
                      {renderEventBadge(ev)}
                    </View>
                    <Text style={styles.eventRowMeta}>{formatEventTimeRange(ev)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null
      )}
      {weekEventsList.length === 0 ? (
        <Text style={styles.mutedCenter}>No events this week.</Text>
      ) : null}
    </View>
  );

  const renderDay = () => (
    <View style={styles.card}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goDayPrev} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, styles.navTitleShrink]} numberOfLines={2}>
          {dayTitle}
        </Text>
        <TouchableOpacity onPress={goDayNext} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {dayEvents.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nothing scheduled"
          subtitle="No events on this day."
        />
      ) : (
        dayEvents.map((ev) => {
          const h = getEventHighlight(ev, nowMs);
          const bar =
            h === 'upcoming' ? colors.primary : h === 'ongoing' ? colors.success : colors.textMuted;
          const bg =
            h === 'upcoming'
              ? colors.primaryMuted
              : h === 'ongoing'
                ? colors.accentTealSoft
                : colors.backgroundSecondary;
          const border =
            h === 'upcoming' ? colors.primary : h === 'ongoing' ? colors.success : colors.cardBorder;
          return (
            <TouchableOpacity
              key={ev.id}
              style={[
                styles.eventRow,
                styles.eventRowLarge,
                { borderColor: border, backgroundColor: bg },
                h !== 'past' && styles.eventRowElevated,
              ]}
              onPress={() => openEvent(ev)}
              activeOpacity={0.75}
            >
              <View style={[styles.eventRowBar, { backgroundColor: bar }]} />
              <View style={styles.eventRowBody}>
                <View style={styles.eventRowTitleRow}>
                  <Text style={[styles.eventRowTitle, h === 'past' && styles.eventRowTitlePast]}>{ev.title}</Text>
                  {renderEventBadge(ev)}
                </View>
                <Text style={styles.eventRowMeta}>{formatEventTimeRange(ev)}</Text>
                {ev.description ? (
                  <Text style={[styles.eventRowDesc, h === 'past' && styles.eventRowDescPast]} numberOfLines={3}>
                    {ev.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  if (!schoolId) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.loaderContent}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderViewToggle()}
        {renderUpcomingPreview()}
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'week' && renderWeek()}
        {viewMode === 'day' && renderDay()}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.backgroundSecondary },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
    loaderContent: { flex: 1, padding: 16 },

    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    togglePill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    togglePillActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    toggleText: {
      fontSize: 14,
      color: colors.textSecondary,
      ...f('semiBold'),
    },
    toggleTextActive: {
      color: colors.primary,
    },

    upcomingCard: {
      paddingVertical: 12,
      marginBottom: 12,
    },
    upcomingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    upcomingHeaderTitle: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      ...f('bold'),
    },
    upcomingHeaderCount: {
      fontSize: 12,
      color: colors.primary,
      backgroundColor: colors.primaryMuted,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      ...f('semiBold'),
    },
    upcomingEmpty: {
      fontSize: 14,
      color: colors.textMuted,
      ...f('regular'),
    },
    upcomingList: { gap: 6 },
    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    upcomingDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    upcomingRowBody: { flex: 1, minWidth: 0 },
    upcomingRowTitle: { fontSize: 14, color: colors.text, ...f('semiBold') },
    upcomingRowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, ...f('regular') },
    upcomingMoreHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 10,
      ...f('regular'),
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 16,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navBtn: { padding: 4 },
    navTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      color: colors.text,
      ...f('bold'),
    },
    navTitleShrink: { fontSize: 15 },

    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayCell: { alignItems: 'center', paddingVertical: 6 },
    weekdayText: { fontSize: 11, color: colors.textMuted, ...f('semiBold') },

    gridRow: { flexDirection: 'row', justifyContent: 'flex-start' },
    dayCell: {
      minHeight: 52,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 8,
    },
    dayCellToday: {
      backgroundColor: colors.primaryMuted,
    },
    dayCellSelected: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayCellHighlight: {
      borderWidth: 2,
    },
    dayCellPastOnly: {
      backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)',
    },
    dayNum: { fontSize: 14, color: colors.text, ...f('medium') },
    dayNumToday: { ...f('bold'), color: colors.primary },
    dayNumSelected: { ...f('bold'), color: colors.primary },
    dotRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 4,
      minHeight: 6,
      justifyContent: 'center',
    },
    eventDot: { width: 5, height: 5, borderRadius: 2.5 },
    eventDotBright: { width: 6, height: 6, borderRadius: 3 },

    weekStrip: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 8,
      marginBottom: 8,
    },
    weekDayChip: {
      width: 52,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    weekDayChipSelected: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    weekDayName: { fontSize: 11, color: colors.textMuted, ...f('semiBold') },
    weekDayNum: { fontSize: 18, color: colors.text, marginTop: 4, ...f('bold') },
    weekDotWrap: { minHeight: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    weekDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    sectionLabel: {
      fontSize: 12,
      letterSpacing: 0.5,
      color: colors.textMuted,
      ...f('semiBold'),
      marginTop: 8,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    weekSection: { marginBottom: 12 },
    weekSectionTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      ...f('semiBold'),
      marginBottom: 8,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingRight: 10,
      marginBottom: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    eventRowElevated: {
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 1 } : {}),
    },
    eventRowLarge: { alignItems: 'flex-start' },
    eventRowBar: { width: 4, alignSelf: 'stretch', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
    eventRowBody: { flex: 1, paddingLeft: 12, paddingRight: 8 },
    eventRowTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    eventRowTitle: { fontSize: 15, color: colors.text, ...f('semiBold'), flex: 1, minWidth: 0 },
    eventRowTitlePast: { color: colors.textSecondary, opacity: 0.85 },
    eventRowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4, ...f('regular') },
    eventRowDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 6, ...f('regular') },
    eventRowDescPast: { opacity: 0.75 },
    eventBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    eventBadgeText: { fontSize: 11, ...f('semiBold') },
    mutedCenter: { textAlign: 'center', color: colors.textMuted, marginTop: 8, ...f('medium') },
  });
}
