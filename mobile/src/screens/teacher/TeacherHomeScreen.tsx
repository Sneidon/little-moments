import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';

export function TeacherHomeScreen({
  navigation,
}: {
  navigation: { navigate: (a: string, b?: { childId: string }) => void };
}) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [reportsToday, setReportsToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  // Load teacher's class(es) and class name (children are assigned by classId, not assignedTeacherId on child)
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
      const classIds = myClasses.map((d) => d.id).slice(0, 10); // Firestore 'in' limit 10
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

  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || children.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const start = todayStart.getTime();
    const end = todayEnd.getTime();

    let cancelled = false;
    let count = 0;
    const check = async () => {
      for (const child of children) {
        const snap = await getDocs(
          collection(db, 'schools', schoolId, 'children', child.id, 'reports')
        );
        snap.docs.forEach((d) => {
          const ts = (d.data() as { timestamp?: string }).timestamp;
          if (ts) {
            const t = new Date(ts).getTime();
            if (t >= start && t <= end) count++;
          }
        });
      }
      if (!cancelled) setReportsToday(count);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, children, refreshTrigger]);

  const renderChild = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Reports', { childId: item.id })}
    >
      <Ionicons name="person-circle-outline" size={28} color="#6366f1" style={styles.cardIcon} />
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        {item.allergies?.length ? (
          <Text style={styles.allergies}>Allergies: {item.allergies.join(', ')}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {className ? (
          <Text style={styles.subtitle}>{className}</Text>
        ) : (
          <Text style={styles.subtitle}>My class</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={20} color="#6366f1" style={styles.statIcon} />
          <Text style={styles.statValue}>{children.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="document-text" size={20} color="#6366f1" style={styles.statIcon} />
          <Text style={styles.statValue}>{reportsToday}</Text>
          <Text style={styles.statLabel}>Reports today</Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Ionicons name="people-outline" size={20} color="#475569" />
        <Text style={styles.sectionTitle}>My students</Text>
      </View>
      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={renderChild}
        ListEmptyComponent={<Text style={styles.empty}>No children assigned yet.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Announcements')}>
        <Ionicons name="megaphone-outline" size={20} color="#fff" style={styles.fabIcon} />
        <Text style={styles.fabText}>Announcements</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => navigation.navigate('Events')}>
        <Ionicons name="calendar-outline" size={20} color="#fff" style={styles.fabIcon} />
        <Text style={styles.fabText}>Events</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIcon: { marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardIcon: { marginRight: 12 },
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  allergies: { fontSize: 12, color: '#64748b', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  fabIcon: { marginRight: 8 },
  fabSecondary: { backgroundColor: '#94a3b8' },
  fabText: { color: '#fff', fontWeight: '600' },
});
