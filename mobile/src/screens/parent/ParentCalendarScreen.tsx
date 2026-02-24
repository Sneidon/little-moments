import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { SkeletonCard } from '../../components/Skeleton';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Event } from '../../../../shared/types';

export function ParentCalendarScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      {!schoolId ? (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
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

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    title: { fontSize: 16, fontWeight: '600', color: colors.text },
    desc: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    acceptBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.success, alignItems: 'center' },
    acceptText: { color: colors.primaryContrast, fontWeight: '600' },
    declineBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    declineText: { color: colors.textMuted },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
