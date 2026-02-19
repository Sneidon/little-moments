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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export function TeacherHomeScreen({
  navigation,
}: {
  navigation: { navigate: (a: string, b?: { childId: string }) => void };
}) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [reportsToday, setReportsToday] = useState(0);
  const [mealsToday, setMealsToday] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [presentChildIds, setPresentChildIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  // Load teacher's class(es) and children
  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      if (cancelled) return;
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      const classIds = myClasses.map((d) => d.id).slice(0, 10);
      setClassName(myClasses[0] ? (myClasses[0].data() as ClassRoom).name : null);

      if (classIds.length === 0) {
        setChildren([]);
        setRefreshing(false);
        return;
      }

      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds)
        ),
        (snap) => {
          if (cancelled) return;
          setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
          setRefreshing(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid, refreshTrigger]);

  // Today's stats: present count, meals, total reports
  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || children.length === 0) {
      setReportsToday(0);
      setMealsToday(0);
      setPresentCount(0);
      setPresentChildIds(new Set());
      return;
    }

    const dayStart = `${selectedDate}T00:00:00.000Z`;
    const dayEnd = `${selectedDate}T23:59:59.999Z`;
    let cancelled = false;

    const check = async () => {
      let total = 0;
      let meals = 0;
      const presentIds = new Set<string>();
      for (const child of children) {
        const snap = await getDocs(
          collection(db, 'schools', schoolId, 'children', child.id, 'reports')
        );
        snap.docs.forEach((d) => {
          const data = d.data() as { timestamp?: string; type?: string };
          const ts = data.timestamp;
          if (ts && ts >= dayStart && ts <= dayEnd) {
            total++;
            if (data.type === 'meal') meals++;
            presentIds.add(child.id);
          }
        });
      }
      if (!cancelled) {
        setReportsToday(total);
        setMealsToday(meals);
        setPresentCount(presentIds.size);
        setPresentChildIds(presentIds);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, children, selectedDate, refreshTrigger]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date.toISOString().slice(0, 10));
  };

  const teacherName = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'Teacher';

  const tabNav = navigation.getParent() as { navigate: (name: string, params?: { initialType: string }) => void } | undefined;

  const quickActions = [
    {
      id: 'meal',
      label: 'Log Meal',
      icon: 'restaurant' as const,
      color: '#ea580c',
      onPress: () => tabNav?.navigate('AddUpdate', { initialType: 'meal' }),
    },
    {
      id: 'nap',
      label: 'Log Nap',
      icon: 'bed' as const,
      color: '#7c3aed',
      onPress: () => tabNav?.navigate('AddUpdate', { initialType: 'nap_time' }),
    },
    {
      id: 'nappy',
      label: 'Log Nappy',
      icon: 'water' as const,
      color: '#0d9488',
      onPress: () => tabNav?.navigate('AddUpdate', { initialType: 'nappy_change' }),
    },
    {
      id: 'activity',
      label: 'Add Activity',
      icon: 'sparkles' as const,
      color: '#2563eb',
      onPress: () => tabNav?.navigate('AddUpdate', { initialType: 'medication' }),
    },
    {
      id: 'photo',
      label: 'Add Photo',
      icon: 'camera' as const,
      color: '#db2777',
      onPress: () => tabNav?.navigate('AddUpdate', { initialType: 'incident' }),
    },
    {
      id: 'message',
      label: 'Message Parent',
      icon: 'chatbubble' as const,
      color: '#16a34a',
      onPress: () => navigation.navigate('Announcements'),
    },
  ];

  const isChildPresentToday = (childId: string): boolean => presentChildIds.has(childId);

  const renderChild = ({ item }: { item: Child }) => {
    const present = isChildPresentToday(item.id);
    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => navigation.navigate('Reports', { childId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.studentCardContent}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentAge}>{getAge(item.dateOfBirth)} old</Text>
        </View>
        <View style={[styles.presentBadge, !present && styles.presentBadgeAbsent]}>
          <Text style={styles.presentBadgeText}>{present ? 'Present' : '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header: gradient-style (solid purple) with profile and Teacher tag */}
        <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
          <View style={styles.headerProfile}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{getInitials(teacherName)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{teacherName}</Text>
              <Text style={styles.headerClass}>{className || 'My class'}</Text>
            </View>
          </View>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Teacher</Text>
          </View>
        </View>

        {/* Date bar */}
        <View style={styles.dateBar}>
          <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={24} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color="#475569" />
            <Text style={styles.dateText}>{displayDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextDay} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={24} color="#475569" />
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

        {/* Today's Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{"Today's Overview"}</Text>
            <TouchableOpacity style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Preview</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statPresent]}>
              <Text style={[styles.statValue, styles.statPresentValue]}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{children.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statMeals]}>
              <Text style={[styles.statValue, styles.statMealsValue]}>{mealsToday}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={[styles.statCard, styles.statPhotos]}>
              <Text style={[styles.statValue, styles.statPhotosValue]}>0</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionBtn}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Students ({children.length})</Text>
          {children.length === 0 ? (
            <Text style={styles.empty}>No children assigned yet.</Text>
          ) : (
            children.map((item) => (
              <View key={item.id}>
                {renderChild({ item })}
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  bottomPad: { height: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#6d28d9',
  },
  headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerText: { marginLeft: 14 },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerClass: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleTagText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrow: { padding: 4 },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  datePickerDone: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  datePickerDoneText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 12 },
  previewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800', color: '#334155' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statPresent: {},
  statPresentValue: { color: '#16a34a' },
  statMeals: {},
  statMealsValue: { color: '#ea580c' },
  statPhotos: {},
  statPhotosValue: { color: '#db2777' },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionBtn: {
    width: '31%',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  studentCardContent: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#334155' },
  studentAge: { fontSize: 13, color: '#64748b', marginTop: 2 },
  presentBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presentBadgeAbsent: { backgroundColor: '#94a3b8' },
  presentBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  empty: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});
