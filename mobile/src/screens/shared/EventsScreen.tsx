import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Event } from '../../../../shared/types';

export function EventsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <Ionicons name="calendar" size={24} color={colors.primary} style={styles.cardIcon} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.eventImage} resizeMode="cover" />
        ) : null}
        {item.documents && item.documents.length > 0 ? (
          <View style={styles.documents}>
            {item.documents.map((d, i) => (
              <TouchableOpacity key={i} onPress={() => d.url && Linking.openURL(d.url)}>
                <Text style={styles.docLink}>{d.label || d.name || d.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <Text style={styles.meta}>{new Date(item.startAt).toLocaleString()}</Text>
        {profile?.role === 'parent' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.id, 'accepted')}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primaryContrast} style={styles.btnIcon} />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, 'declined')}>
              <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} style={styles.btnIcon} />
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
        <Ionicons name="calendar-outline" size={22} color={colors.text} />
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

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    screenTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardIcon: { marginRight: 12 },
    cardContent: { flex: 1 },
    title: { fontSize: 16, fontWeight: '600', color: colors.text },
    desc: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    eventImage: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
    documents: { marginTop: 8, gap: 4 },
    docLink: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    acceptBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.success,
    },
    acceptText: { color: colors.primaryContrast, fontWeight: '600' },
    declineBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    declineText: { color: colors.textMuted },
    btnIcon: {},
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
