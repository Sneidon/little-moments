import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../../../shared/types';

export function EventsScreen() {
  const { profile } = useAuth();
  const [list, setList] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'schools', profile.schoolId, 'events'),
      orderBy('startAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
      setRefreshing(false);
    });
    return () => unsub();
  }, [profile?.schoolId, refreshTrigger]);

  const respond = async (eventId: string, response: 'accepted' | 'declined') => {
    if (!profile?.schoolId || profile.role !== 'parent') return;
    const ref = doc(db, 'schools', profile.schoolId, 'events', eventId);
    await updateDoc(ref, { [`parentResponses.${profile.uid}`]: response });
  };

  const renderItem = ({ item }: { item: Event }) => (
    <View style={styles.card}>
      <Ionicons name="calendar" size={24} color="#6366f1" style={styles.cardIcon} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        <Text style={styles.meta}>{new Date(item.startAt).toLocaleString()}</Text>
        {profile?.role === 'parent' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.id, 'accepted')}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.btnIcon} />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, 'declined')}>
              <Ionicons name="close-circle-outline" size={18} color="#64748b" style={styles.btnIcon} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="calendar-outline" size={22} color="#1e293b" />
        <Text style={styles.screenTitle}>Events</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No events.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardIcon: { marginRight: 12 },
  cardContent: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  desc: { fontSize: 14, color: '#475569', marginTop: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#22c55e',
  },
  acceptText: { color: '#fff', fontWeight: '600' },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  declineText: { color: '#64748b' },
  btnIcon: {},
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
