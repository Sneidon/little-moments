import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';

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
  const { profile, selectedChildId, setSelectedChildId } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

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
  }, [profile?.uid, setSelectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];

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
    });
    return () => unsub();
  }, [selectedChild?.id, selectedChild?.schoolId, selectedDate]);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
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

  const renderReport = ({ item }: { item: DailyReport }) => (
    <View style={styles.updateCard}>
      <Text style={styles.updateTime}>{formatTime(item.timestamp)}</Text>
      <Text style={styles.updateType}>{item.type.replace('_', ' ')}</Text>
      {item.notes ? <Text style={styles.updateNotes}>{item.notes}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        {children.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childChips}>
            {children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, selectedChildId === c.id && styles.childChipActive]}
                onPress={() => setSelectedChildId(c.id)}
              >
                <Text style={[styles.childChipText, selectedChildId === c.id && styles.childChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : selectedChild ? (
          <TouchableOpacity
            style={styles.childHeader}
            onPress={() => navigation.navigate('ChildProfile', { childId: selectedChild.id, schoolId: selectedChild.schoolId })}
          >
            <Text style={styles.childName}>{selectedChild.name}</Text>
            <Text style={styles.childMeta}>{getAge(selectedChild.dateOfBirth)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.dateBar}>
        <TouchableOpacity onPress={prevDay} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{isToday ? 'Today' : new Date(selectedDate).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={nextDay} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{meals}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{naps}</Text>
          <Text style={styles.statLabel}>Nap</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{nappy}</Text>
          <Text style={styles.statLabel}>Nappy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activities}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{isToday ? "Today's updates" : 'Updates'}</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        ListEmptyComponent={<Text style={styles.empty}>No updates for this day.</Text>}
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
  header: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  childChips: { marginTop: 8 },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  childChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  childChipText: { fontSize: 14, color: '#64748b' },
  childChipTextActive: { color: '#6366f1', fontWeight: '600' },
  childHeader: { marginTop: 8 },
  childName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  childMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrow: { padding: 4 },
  dateArrowText: { fontSize: 18, color: '#6366f1' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#6366f1' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
  updateCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  updateTime: { fontSize: 12, color: '#64748b' },
  updateType: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  updateNotes: { fontSize: 14, color: '#475569', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  fab: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, marginTop: 8 },
  fabSecondary: { backgroundColor: '#94a3b8' },
  fabText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
