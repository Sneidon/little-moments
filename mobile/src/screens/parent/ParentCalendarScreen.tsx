import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../../../shared/types';

export function ParentCalendarScreen() {
  const { profile } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [list, setList] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    const q = query(
      collection(db, 'schools', schoolId, 'events'),
      orderBy('startAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
      setRefreshing(false);
    });
    return () => unsub();
  }, [schoolId, refreshTrigger]);

  const respond = async (eventId: string, response: 'accepted' | 'declined') => {
    if (!schoolId || !profile?.uid) return;
    const ref = doc(db, 'schools', schoolId, 'events', eventId);
    await updateDoc(ref, { [`parentResponses.${profile.uid}`]: response });
  };

  const renderItem = ({ item }: { item: Event }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      <Text style={styles.meta}>{new Date(item.startAt).toLocaleString()}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.id, 'accepted')}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, 'declined')}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="calendar-outline" size={24} color="#1e293b" />
        <View>
          <Text style={styles.header}>Calendar</Text>
          <Text style={styles.subheader}>Events and important dates</Text>
        </View>
      </View>
      {!schoolId ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No events.</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subheader: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  desc: { fontSize: 14, color: '#475569', marginTop: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '600' },
  declineBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  declineText: { color: '#64748b' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
