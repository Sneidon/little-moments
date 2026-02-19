import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function ParentHomeScreen({
  navigation,
}: {
  navigation: { navigate: (a: string, b?: { childId: string; schoolId: string }) => void };
}) {
  const insets = useSafeAreaInsets();
  const { profile, selectedChildId, setSelectedChildId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [className, setClassName] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    (async () => {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const list: Child[] = [];
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
      }
      setChildren(list);
      if (list.length > 0) {
        setSelectedChildId((prev) => {
          if (!prev || !list.some((c) => c.id === prev)) return list[0].id;
          return prev;
        });
      }
    })();
  }, [profile?.uid, setSelectedChildId, refreshTrigger]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];

  useEffect(() => {
    if (!selectedChild?.schoolId || !selectedChild?.classId) {
      setClassName(null);
      return;
    }
    getDoc(doc(db, 'schools', selectedChild.schoolId, 'classes', selectedChild.classId)).then(
      (snap) => {
        if (snap.exists()) setClassName((snap.data() as ClassRoom).name);
        else setClassName(null);
      }
    );
  }, [selectedChild?.schoolId, selectedChild?.classId]);

  useEffect(() => {
    if (!selectedChild?.schoolId || !selectedChild?.id) return;
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    const q = query(
      collection(db, 'schools', selectedChild.schoolId, 'children', selectedChild.id, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyReport));
      const filtered = list.filter((r) => r.timestamp >= start && r.timestamp <= end);
      setReports(filtered);
      setRefreshing(false);
    });
    return () => unsub();
  }, [selectedChild?.id, selectedChild?.schoolId, selectedDate, refreshTrigger]);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date.toISOString().slice(0, 10));
  };
  const meals = reports.filter((r) => r.type === 'meal').length;
  const naps = reports.filter((r) => r.type === 'nap_time').length;
  const nappy = reports.filter((r) => r.type === 'nappy_change').length;
  const activities = reports.filter((r) => r.type !== 'meal' && r.type !== 'nap_time' && r.type !== 'nappy_change').length;

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

  const reportTypeIcon = (type: string) => {
    if (type === 'meal') return 'restaurant-outline';
    if (type === 'nap_time') return 'bed-outline';
    if (type === 'nappy_change') return 'water-outline';
    return 'sparkles-outline';
  };

  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

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
        {/* Header: purple, child-focused (like Teacher header but for child) */}
        <View style={[styles.header, { paddingTop: Math.max(56, insets.top + 12) }]}>
          <TouchableOpacity
            style={styles.headerProfile}
            onPress={() =>
              selectedChild &&
              navigation.navigate('ChildProfile', {
                childId: selectedChild.id,
                schoolId: selectedChild.schoolId,
              })
            }
            activeOpacity={selectedChild ? 0.8 : 1}
            disabled={!selectedChild}
          >
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>
                {selectedChild ? getInitials(selectedChild.name) : '…'}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{selectedChild?.name ?? 'Loading…'}</Text>
              <Text style={styles.headerClass}>
                {selectedChild ? getAge(selectedChild.dateOfBirth) : ''}
                {className ? ` · ${className}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Parent</Text>
          </View>
        </View>
        {children.length > 1 ? (
          <View style={styles.childChipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childChipsContent}
            >
              {children.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.childChip, selectedChildId === c.id && styles.childChipActive]}
                  onPress={() => setSelectedChildId(c.id)}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildId === c.id && styles.childChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Date bar - same as Teacher */}
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

        {/* Today's Overview - same as Teacher (no Quick Actions) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{"Today's Overview"}</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => navigation.navigate('Announcements')}
            >
              <Text style={styles.previewBtnText}>Announcements</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statMeals]}>
              <Text style={[styles.statValue, styles.statMealsValue]}>{meals}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={[styles.statCard, styles.statNap]}>
              <Text style={[styles.statValue, styles.statNapValue]}>{naps}</Text>
              <Text style={styles.statLabel}>Nap</Text>
            </View>
            <View style={[styles.statCard, styles.statNappy]}>
              <Text style={[styles.statValue, styles.statNappyValue]}>{nappy}</Text>
              <Text style={styles.statLabel}>Nappy</Text>
            </View>
            <View style={[styles.statCard, styles.statActivities]}>
              <Text style={[styles.statValue, styles.statActivitiesValue]}>{activities}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
          </View>
        </View>

        {/* Today's Updates - like My Students section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isToday ? "Today's Updates" : 'Updates'}
          </Text>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No updates for this day.</Text>
          ) : (
            reports.map((item) => (
              <View key={item.id} style={styles.updateCard}>
                <Ionicons
                  name={reportTypeIcon(item.type) as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color="#6366f1"
                  style={styles.updateCardIcon}
                />
                <View style={styles.updateCardContent}>
                  <Text style={styles.updateTime}>{formatTime(item.timestamp)}</Text>
                  <Text style={styles.updateType}>{item.type.replace('_', ' ')}</Text>
                  {item.notes ? (
                    <Text style={styles.updateNotes}>{item.notes}</Text>
                  ) : null}
                </View>
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
    paddingVertical: 20,
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

  childChipsWrap: { backgroundColor: '#6d28d9', paddingBottom: 12, paddingHorizontal: 4 },
  childChipsContent: { paddingHorizontal: 16 },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 8,
  },
  childChipActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.35)' },
  childChipText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  childChipTextActive: { color: '#fff', fontWeight: '600' },

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
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  datePickerDone: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#6d28d9',
    borderRadius: 8,
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
  statMeals: {},
  statMealsValue: { color: '#ea580c' },
  statNap: {},
  statNapValue: { color: '#7c3aed' },
  statNappy: {},
  statNappyValue: { color: '#0d9488' },
  statActivities: {},
  statActivitiesValue: { color: '#2563eb' },

  updateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  updateCardIcon: { marginRight: 12 },
  updateCardContent: { flex: 1 },
  updateTime: { fontSize: 12, color: '#64748b' },
  updateType: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  updateNotes: { fontSize: 14, color: '#475569', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});
