import React, { useEffect, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

import { getOrCreateChat } from '../../api/chat';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { font } from '../../theme/typography';
import { getAge, getInitials, formatTime } from '../../utils';

import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';

type ReportsRouteParams = { childId: string };
type Props = {
  route: { params: ReportsRouteParams };
  navigation: {
    navigate: (name: 'ReportDetail' | 'AddUpdate' | 'ChatThread', params?: object) => void;
    setOptions: (o: object) => void;
  };
};

// Extended report for fields stored in Firestore
type ReportWithExtras = DailyReport & {
  napStartTime?: string;
  napEndTime?: string;
  activityTitle?: string;
  activityType?: string;
  mealType?: 'breakfast' | 'lunch' | 'snack';
  mealOptionName?: string;
};

function getReportTitle(item: ReportWithExtras): string {
  if (item.type === 'meal')
    return (item.mealOptionName || item.mealType || 'Meal').charAt(0).toUpperCase()
      + (item.mealOptionName || item.mealType || 'meal').slice(1);
  if (item.type === 'nap_time') return 'Nap Time';
  if (item.type === 'nappy_change') return 'Nappy Change';
  if (item.type === 'medication') return item.activityTitle || 'Activity';
  if (item.type === 'incident') return 'Photo';
  return String(item.type).replace('_', ' ');
}

function reportIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'meal') return 'restaurant-outline';
  if (type === 'nap_time') return 'moon-outline';
  if (type === 'nappy_change') return 'water-outline';
  if (type === 'medication') return 'sparkles-outline';
  if (type === 'incident') return 'camera-outline';
  return 'ellipse-outline';
}

function reportIconColor(type: string): string {
  if (type === 'meal') return '#ea580c';
  if (type === 'nap_time') return '#7c3aed';
  if (type === 'nappy_change') return '#0d9488';
  if (type === 'medication') return '#2563eb';
  if (type === 'incident') return '#db2777';
  return '#64748b';
}

/** Parse time-only string (e.g. "13:00") with a date string to get ms. Nap times are stored as "HH:mm". */
function parseTimeWithDate(timeStr: string | undefined, dateStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  const h = !isNaN(parts[0]) ? parts[0] : 0;
  const m = !isNaN(parts[1]) ? parts[1] : 0;
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function getReportDateStr(r: ReportWithExtras): string {
  const t = r.timestamp ?? r.createdAt;
  if (typeof t === 'string') return t.slice(0, 10);
  if (t && typeof (t as { toDate?: () => Date }).toDate === 'function') {
    return (t as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  return '';
}

export function TeacherReportsScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const compact = width < 368;
  const styles = useMemo(() => createStyles(colors, compact, isDark), [colors, compact, isDark]);
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [childLoading, setChildLoading] = useState(true);
  const [childMissing, setChildMissing] = useState(false);
  const [reports, setReports] = useState<ReportWithExtras[]>([]);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const schoolId = profile?.schoolId;
  const startOfDay = `${selectedDate}T00:00:00.000Z`;
  const endOfDay = `${selectedDate}T23:59:59.999Z`;

  const dayReports = reports.filter((r) => {
    const t = r.timestamp || r.createdAt;
    return t >= startOfDay && t <= endOfDay;
  });
  const sortedDayReports = [...dayReports].sort(
    (a, b) =>
      new Date(a.timestamp || a.createdAt).getTime() -
      new Date(b.timestamp || b.createdAt).getTime()
  );

  const meals = dayReports.filter((r) => r.type === 'meal').length;
  const naps = dayReports.filter((r) => r.type === 'nap_time');
  const nappy = dayReports.filter((r) => r.type === 'nappy_change').length;
  const activities = dayReports.filter(
    (r) => r.type === 'medication' || r.type === 'incident'
  ).length;

  let napDuration = '';
  if (naps.length > 0) {
    let totalMs = 0;
    const dateStr = selectedDate;
    for (const n of naps) {
      const r = n as ReportWithExtras;
      const reportDate = getReportDateStr(r) || dateStr;
      if (r.napStartTime && r.napEndTime) {
        const startMs = parseTimeWithDate(r.napStartTime, reportDate);
        const endMs = parseTimeWithDate(r.napEndTime, reportDate);
        if (!isNaN(startMs) && !isNaN(endMs)) {
          totalMs += endMs - startMs;
        } else {
          totalMs += 1.5 * 60 * 60 * 1000;
        }
      } else {
        totalMs += 1.5 * 60 * 60 * 1000;
      }
    }
    const hours = totalMs / (60 * 60 * 1000);
    napDuration =
      Number.isFinite(hours) && hours >= 0
        ? hours >= 1
          ? `${hours.toFixed(1)}h`
          : `${Math.round(hours * 60)}m`
        : '0h';
  } else {
    napDuration = '0h';
  }

  useEffect(() => {
    if (!schoolId || !childId) {
      setChildLoading(false);
      return;
    }
    let cancelled = false;
    setChildLoading(true);
    setChildMissing(false);
    setChild(null);
    setClassName(null);
    (async () => {
      try {
        const childRef = doc(db, 'schools', schoolId, 'children', childId);
        const snap = await getDoc(childRef);
        if (cancelled) return;
        if (!snap.exists()) {
          setChildMissing(true);
          return;
        }
        const data = snap.data() as Child;
        setChild({ ...data, id: snap.id } as Child);
        if (data.classId) {
          const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', data.classId));
          if (!cancelled && classSnap.exists()) {
            setClassName((classSnap.data() as ClassRoom).name);
          }
        }
      } catch {
        if (!cancelled) setChildMissing(true);
      } finally {
        if (!cancelled) setChildLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId]);

  useEffect(() => {
    if (!schoolId || !childId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'children', childId, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReportWithExtras))
      );
    });
    return () => unsub();
  }, [schoolId, childId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) <= today)
      setSelectedDate(d.toISOString().slice(0, 10));
  };

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date.toISOString().slice(0, 10));
  };

  const onMessageParents = useCallback(async () => {
    if (!schoolId || !child?.parentIds?.length) {
      Alert.alert('No parents', 'This child has no linked parents.');
      return;
    }
    const parentId = child.parentIds[0];
    setMessageLoading(true);
    try {
      const { chatId, schoolId: sid } = await getOrCreateChat(schoolId, childId, parentId);
      navigation.navigate('ChatThread', { chatId, schoolId: sid });
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  }, [schoolId, childId, child?.parentIds, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Daily report',
      headerBackTitle: 'Back',
    });
  }, [navigation]);

  if (!schoolId) return null;

  const scrollBottom = 24 + Math.max(insets.bottom, 8);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {childLoading ? (
          <View style={styles.profileCard}>
            <SkeletonCircle size={52} />
            <View style={styles.profileTextCol}>
              <Skeleton width="72%" height={20} borderRadius={8} style={{ marginBottom: 10 }} />
              <Skeleton width="48%" height={14} borderRadius={6} />
            </View>
          </View>
        ) : childMissing || !child ? (
          <View style={styles.profileCard}>
            <View style={[styles.profileAvatar, styles.profileAvatarMuted]}>
              <Ionicons name="person-outline" size={26} color={colors.textMuted} />
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>Child not found</Text>
              <Text style={styles.profileMeta}>This student may have been removed.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.profileCard}>
            {child.photoURL ? (
              <Image source={{ uri: child.photoURL }} style={styles.profileAvatarImg} />
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{getInitials(child.name)}</Text>
              </View>
            )}
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {child.name}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {getAge(child.dateOfBirth)}
                {className ? ` · ${className}` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.dateBar}>
          <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            <Text style={styles.dateText}>{displayDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextDay} style={styles.dateArrow} disabled={isToday}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textMuted}
              style={{ opacity: isToday ? 0.28 : 1 }}
            />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={new Date(selectedDate + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'calendar' : 'default'}
              onChange={onDatePickerChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.overviewSection}>
          {childLoading ? (
            <Skeleton width={160} height={20} borderRadius={8} style={{ marginBottom: 12 }} />
          ) : (
            <Text style={styles.overviewTitle}>{"Today's overview"}</Text>
          )}
          {childLoading ? (
            <View style={styles.summaryRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.summaryCard, styles.summarySkeletonCard]}>
                  <Skeleton width={compact ? 24 : 30} height={compact ? 18 : 22} borderRadius={6} />
                  <Skeleton width={compact ? 36 : 44} height={10} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : childMissing ? (
            <Text style={styles.unavailableHint}>Overview unavailable</Text>
          ) : (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryMeals]}>
                <Text style={[styles.summaryValue, styles.summaryMealsValue]}>{meals}/3</Text>
                <Text style={styles.summaryLabel}>Meals</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryNap]}>
                <Text style={[styles.summaryValue, styles.summaryNapValue]}>{napDuration}</Text>
                <Text style={styles.summaryLabel}>Nap</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryNappy]}>
                <Text style={[styles.summaryValue, styles.summaryNappyValue]}>{nappy}</Text>
                <Text style={styles.summaryLabel}>Nappy</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryActivities]}>
                <Text style={[styles.summaryValue, styles.summaryActivitiesValue]}>{activities}</Text>
                <Text style={styles.summaryLabel}>Activities</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtnOutline,
              (childLoading ||
                childMissing ||
                !child?.parentIds?.length ||
                messageLoading) &&
                styles.actionBtnDisabled,
            ]}
            onPress={onMessageParents}
            disabled={
              childLoading || childMissing || messageLoading || !child?.parentIds?.length
            }
            activeOpacity={0.75}
          >
            {messageLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="chatbubble-outline"
                  size={22}
                  color={
                    childLoading || childMissing || !child?.parentIds?.length
                      ? colors.textMuted
                      : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.actionBtnOutlineText,
                    (childLoading || childMissing || !child?.parentIds?.length) && {
                      color: colors.textMuted,
                    },
                  ]}
                >
                  Message parents
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnPrimary,
              (childLoading || childMissing) && styles.actionBtnDisabledSolid,
            ]}
            onPress={() => navigation.navigate('AddUpdate', { initialChildId: childId })}
            disabled={childLoading || childMissing}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={24} color={colors.primaryContrast} />
            <Text style={[styles.actionBtnText, styles.actionBtnPrimaryText]}>Add update</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {childLoading ? (
            <Skeleton width={200} height={20} borderRadius={8} style={{ marginBottom: 14 }} />
          ) : (
            <Text style={styles.sectionTitle}>
              {isToday ? "Today's Updates" : `Updates · ${displayDate}`}
            </Text>
          )}
          {childLoading ? (
            <View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.timelineCard}>
                  <Skeleton width={44} height={44} borderRadius={12} />
                  <View style={styles.timelineSkeletonCol}>
                    <Skeleton width={52} height={12} borderRadius={4} />
                    <Skeleton width="85%" height={16} borderRadius={6} style={{ marginTop: 10 }} />
                    <Skeleton width="70%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : childMissing ? (
            <Text style={styles.unavailableHint}>No updates to show.</Text>
          ) : sortedDayReports.length === 0 ? (
            <View style={styles.emptyBlock}>
              <EmptyState
                icon="create-outline"
                title="No updates for this day"
                subtitle="Log meals, naps, nappy changes, or activities so parents stay in the loop."
              />
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddUpdate', { initialChildId: childId })}
                activeOpacity={0.88}
              >
                <Ionicons name="add" size={22} color={colors.primaryContrast} />
                <Text style={[styles.emptyCtaText, { color: colors.primaryContrast }]}>Add update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedDayReports.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.timelineCard}
                onPress={() =>
                  schoolId &&
                  navigation.navigate('ReportDetail', {
                    schoolId,
                    childId,
                    reportId: item.id,
                  })
                }
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`View details: ${getReportTitle(item)}`}
              >
                <View
                  style={[
                    styles.timelineIconWrap,
                    { backgroundColor: reportIconColor(item.type) + (isDark ? '35' : '22') },
                  ]}
                >
                  <Ionicons
                    name={reportIcon(item.type)}
                    size={20}
                    color={reportIconColor(item.type)}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineRowTop}>
                    <Text style={styles.timelineTime}>
                      {formatTime(item.timestamp || item.createdAt)}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                  <Text style={styles.timelineTitle}>{getReportTitle(item)}</Text>
                  {item.notes ? (
                    <Text style={styles.timelineNotes} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(
  colors: import('../../theme/colors').ColorPalette,
  compact: boolean,
  isDark: boolean
) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.backgroundSecondary },
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.avatarBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarMuted: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileAvatarImg: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    profileAvatarText: {
      fontSize: 18,
      fontFamily: font.bold,
      fontWeight: '700',
      color: colors.avatarText,
    },
    profileTextCol: { marginLeft: 14, flex: 1, minWidth: 0 },
    profileName: {
      fontSize: 18,
      fontFamily: font.bold,
      fontWeight: '700',
      color: colors.text,
    },
    profileMeta: {
      fontSize: 14,
      fontFamily: font.regular,
      color: colors.textSecondary,
      marginTop: 4,
    },

    dateBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dateArrow: { padding: 4 },
    dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    datePickerDone: {
      marginTop: 8,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 8,
      marginHorizontal: 16,
    },
    datePickerDoneText: {
      color: colors.primaryContrast,
      fontWeight: '600',
      fontSize: 16,
      fontFamily: font.semiBold,
    },

    overviewSection: {
      marginTop: 22,
      paddingHorizontal: 16,
    },
    overviewTitle: {
      fontSize: 18,
      fontFamily: font.bold,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: compact ? 6 : 10,
      alignItems: 'stretch',
    },
    summaryCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.card,
      paddingVertical: compact ? 10 : 14,
      paddingHorizontal: compact ? 4 : 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      ...(isDark
        ? {}
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    summaryValue: {
      fontSize: compact ? 18 : 22,
      fontFamily: font.bold,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    summaryLabel: {
      fontSize: compact ? 10 : 11,
      fontFamily: font.medium,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    summaryMeals: {},
    summaryMealsValue: { color: colors.warning },
    summaryNap: {},
    summaryNapValue: { color: '#7c3aed' },
    summaryNappy: {},
    summaryNappyValue: { color: '#0d9488' },
    summaryActivities: {},
    summaryActivitiesValue: { color: '#2563eb' },
    summarySkeletonCard: {
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: compact ? 68 : 76,
    },
    unavailableHint: {
      fontSize: 14,
      fontFamily: font.regular,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 20,
    },
    timelineSkeletonCol: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
      justifyContent: 'center',
    },

    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 20,
    },
    actionBtnOutline: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    actionBtnDisabled: {
      borderColor: colors.border,
      opacity: 0.85,
    },
    actionBtnOutlineText: {
      fontSize: 15,
      fontFamily: font.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      ...(isDark
        ? {}
        : {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }),
    },
    actionBtnDisabledSolid: {
      opacity: 0.45,
    },
    actionBtnText: {
      fontSize: 15,
      fontFamily: font.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionBtnPrimaryText: { color: colors.primaryContrast, fontFamily: font.semiBold },

    section: { marginTop: 28, paddingHorizontal: 16, paddingBottom: 8 },
    sectionTitle: {
      fontSize: 18,
      fontFamily: font.bold,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 14,
      letterSpacing: -0.2,
    },
    emptyBlock: { marginHorizontal: -8 },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
      marginHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
    },
    emptyCtaText: { fontSize: 16, fontFamily: font.semiBold, fontWeight: '600' },
    timelineCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    timelineIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    timelineContent: { flex: 1, minWidth: 0 },
    timelineRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timelineTime: {
      fontSize: 12,
      fontFamily: font.medium,
      color: colors.textMuted,
    },
    timelineTitle: {
      fontSize: 16,
      fontFamily: font.semiBold,
      fontWeight: '600',
      color: colors.text,
      marginTop: 4,
    },
    timelineNotes: {
      fontSize: 14,
      fontFamily: font.regular,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 20,
    },
  });
}
