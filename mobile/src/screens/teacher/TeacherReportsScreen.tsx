import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

import { getOrCreateChat } from '../../api/chat';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton } from '../../components/Skeleton';
import { getAge, getInitials, formatTime } from '../../utils';

import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';

type ReportsRouteParams = { childId: string };
type Props = { route: { params: ReportsRouteParams }; navigation: { navigate: (name: string, params?: object) => void; getParent: () => unknown } };

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
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
    if (!schoolId || !childId) return;
    const childRef = doc(db, 'schools', schoolId, 'children', childId);
    getDoc(childRef).then(async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Child;
      setChild({ ...data, id: snap.id } as Child);
      if (data.classId) {
        const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', data.classId));
        if (classSnap.exists()) setClassName((classSnap.data() as ClassRoom).name);
      }
    });
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

  if (!schoolId) return null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header: child like Teacher home header */}
      <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
        <View style={styles.headerProfile}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {child ? getInitials(child.name) : '…'}
            </Text>
          </View>
          <View style={styles.headerText}>
            {child?.name ? (
              <Text style={styles.headerName}>{child.name}</Text>
            ) : (
              <Skeleton width={140} height={20} style={{ marginBottom: 4 }} />
            )}
            <Text style={styles.headerClass}>
              {child ? getAge(child.dateOfBirth) : ''}
              {className ? ` · ${className}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>Daily report</Text>
        </View>
      </View>

      {/* Date bar - same as home screen */}
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
        <TouchableOpacity onPress={nextDay} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
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

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryMeals]}>
          <Text style={[styles.summaryValue, styles.summaryMealsValue]}>
            {meals}/3
          </Text>
          <Text style={styles.summaryLabel}>Meals</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryNap]}>
          <Text style={[styles.summaryValue, styles.summaryNapValue]}>
            {napDuration}
          </Text>
          <Text style={styles.summaryLabel}>Nap</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryNappy]}>
          <Text style={[styles.summaryValue, styles.summaryNappyValue]}>
            {nappy}
          </Text>
          <Text style={styles.summaryLabel}>Nappy</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryActivities]}>
          <Text style={[styles.summaryValue, styles.summaryActivitiesValue]}>
            {activities}
          </Text>
          <Text style={styles.summaryLabel}>Activities</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { marginRight: 8 }]}
          onPress={() =>
            schoolId &&
            (navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined)?.navigate('EditChildProfileTeacher', {
              childId,
              schoolId,
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onMessageParents}
          disabled={messageLoading || !child?.parentIds?.length}
          activeOpacity={0.7}
        >
          {messageLoading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={22} color={colors.textMuted} />
              <Text style={styles.actionBtnText}>Message parents</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'AddUpdate',
              params: { initialChildId: childId },
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primaryContrast} />
          <Text style={[styles.actionBtnText, styles.actionBtnPrimaryText]}>Add update</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Updates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isToday ? "Today's Updates" : 'Updates'}
        </Text>
        {sortedDayReports.length === 0 ? (
          <Text style={styles.empty}>No updates for this day.</Text>
        ) : (
          sortedDayReports.map((item) => (
            <View key={item.id} style={styles.timelineCard}>
              <View
                style={[
                  styles.timelineIconWrap,
                  { backgroundColor: reportIconColor(item.type) + '20' },
                ]}
              >
                <Ionicons
                  name={reportIcon(item.type)}
                  size={22}
                  color={reportIconColor(item.type)}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{getReportTitle(item)}</Text>
                <Text style={styles.timelineTime}>
                  {formatTime(item.timestamp || item.createdAt)}
                </Text>
                {item.notes ? (
                  <Text style={styles.timelineNotes}>{item.notes}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.header,
    },
    headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarLarge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.headerAccent,
      borderWidth: 2,
      borderColor: colors.headerText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLargeText: { fontSize: 18, fontWeight: '700', color: colors.headerText },
    headerText: { marginLeft: 14 },
    headerName: { fontSize: 20, fontWeight: '700', color: colors.headerText },
    headerClass: { fontSize: 14, color: colors.headerTextMuted, marginTop: 2 },
    roleTag: {
      backgroundColor: colors.headerAccent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    roleTagText: { fontSize: 13, fontWeight: '600', color: colors.headerText },

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
    datePickerDoneText: { color: colors.primaryContrast, fontWeight: '600', fontSize: 16 },

    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 20,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    summaryValue: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
    summaryLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    summaryMeals: {},
    summaryMealsValue: { color: colors.warning },
    summaryNap: {},
    summaryNapValue: { color: '#7c3aed' },
    summaryNappy: {},
    summaryNappyValue: { color: '#0d9488' },
    summaryActivities: {},
    summaryActivitiesValue: { color: '#2563eb' },

    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 20,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionBtnPrimaryText: { color: colors.primaryContrast },

    section: { marginTop: 24, paddingHorizontal: 16, paddingBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
    timelineCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    timelineIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    timelineContent: { flex: 1 },
    timelineTitle: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    timelineTime: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    timelineNotes: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  });
}
