import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { DailyReport } from '../../../../shared/types';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type ParentStackParamList = {
  ParentHome: undefined;
  ChildProfile: { childId: string; schoolId: string };
  Announcements: undefined;
  Events: undefined;
};
type Props = NativeStackScreenProps<ParentStackParamList, 'ChildProfile'>;

type ReportWithExtras = DailyReport & {
  napStartTime?: string;
  napEndTime?: string;
  activityTitle?: string;
  mealType?: 'breakfast' | 'lunch' | 'snack';
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

function getReportTitle(item: ReportWithExtras): string {
  if (item.type === 'meal')
    return (item.mealType || 'Meal').charAt(0).toUpperCase() + (item.mealType || 'meal').slice(1);
  if (item.type === 'nap_time') return 'Nap Time';
  if (item.type === 'nappy_change') return 'Nappy Change';
  if (item.type === 'medication') return item.activityTitle || 'Activity';
  if (item.type === 'incident') return 'Photo';
  return item.type.replace('_', ' ');
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

export function ParentChildProfileScreen({ route }: Props) {
  const { childId, schoolId } = route.params;
  const [reports, setReports] = useState<ReportWithExtras[]>([]);
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    for (const n of naps) {
      const r = n as ReportWithExtras;
      if (r.napStartTime && r.napEndTime) {
        totalMs +=
          new Date(r.napEndTime).getTime() - new Date(r.napStartTime).getTime();
      } else {
        totalMs += 1.5 * 60 * 60 * 1000;
      }
    }
    const hours = totalMs / (60 * 60 * 1000);
    napDuration = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}m`;
  } else {
    napDuration = '0h';
  }

  useEffect(() => {
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

  useEffect(() => {
    (async () => {
      const childSnap = await getDoc(doc(db, 'schools', schoolId, 'children', childId));
      if (childSnap.exists()) setChild({ id: childSnap.id, ...childSnap.data() } as Child);
      const childData = childSnap.data() as Child | undefined;
      if (childData?.classId) {
        const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', childData.classId));
        if (classSnap.exists()) setClassName((classSnap.data() as ClassRoom).name);
      }
    })();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header: child like Parent home */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily report</Text>
        {child ? (
          <View style={styles.childHeader}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childMeta}>
              {getAge(child.dateOfBirth)}
              {className ? ` · ${className}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.childMeta}>Loading…</Text>
        )}
      </View>

      {/* Date bar - same as home screen */}
      <View style={styles.dateBar}>
        <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateCenter}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          <Text style={styles.dateText}>{displayDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextDay} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#6366f1" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  childHeader: { marginTop: 8 },
  childName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  childMeta: { fontSize: 14, color: '#64748b', marginTop: 2 },

  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrow: { padding: 4 },
  dateCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dateText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  datePickerDone: {
    marginBottom: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  datePickerDoneText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20, marginHorizontal: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  summaryMeals: {},
  summaryMealsValue: { color: '#ea580c' },
  summaryNap: {},
  summaryNapValue: { color: '#7c3aed' },
  summaryNappy: {},
  summaryNappyValue: { color: '#0d9488' },
  summaryActivities: {},
  summaryActivitiesValue: { color: '#2563eb' },

  section: { marginTop: 4, paddingHorizontal: 0, paddingLeft: 16, paddingRight: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 12 },
  empty: { color: '#64748b', textAlign: 'center', paddingVertical: 24 },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  timelineTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  timelineTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timelineNotes: { fontSize: 14, color: '#475569', marginTop: 6 },
});
