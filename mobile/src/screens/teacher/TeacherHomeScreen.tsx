import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
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

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;

    const unsubChildren = onSnapshot(
      query(
        collection(db, 'schools', schoolId, 'children'),
        where('assignedTeacherId', '==', uid)
      ),
      (snap) => {
        setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      }
    );

    return () => unsubChildren();
  }, [profile?.schoolId, profile?.uid]);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      const myClass = classesSnap.docs.find(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      setClassName(myClass ? (myClass.data() as ClassRoom).name : null);
    })();
  }, [profile?.schoolId, profile?.uid]);

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
  }, [profile?.schoolId, children]);

  const renderChild = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Reports', { childId: item.id })}
    >
      <Text style={styles.name}>{item.name}</Text>
      {item.allergies?.length ? (
        <Text style={styles.allergies}>Allergies: {item.allergies.join(', ')}</Text>
      ) : null}
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
          <Text style={styles.statValue}>{children.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{reportsToday}</Text>
          <Text style={styles.statLabel}>Reports today</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My students</Text>
      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={renderChild}
        ListEmptyComponent={<Text style={styles.empty}>No children assigned yet.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Announcements')}>
        <Text style={styles.fabText}>Announcements</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => navigation.navigate('Events')}>
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
  statValue: { fontSize: 24, fontWeight: '700', color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  allergies: { fontSize: 12, color: '#64748b', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  fab: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, marginTop: 8 },
  fabSecondary: { backgroundColor: '#94a3b8' },
  fabText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
