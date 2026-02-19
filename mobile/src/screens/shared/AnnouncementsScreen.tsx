import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Announcement } from '../../../../shared/types';

export function AnnouncementsScreen() {
  const { profile } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'schools', profile.schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No announcements.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  body: { fontSize: 14, color: '#475569', marginTop: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
