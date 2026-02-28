import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Announcement } from '../../../../shared/types';

export function AnnouncementsScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [list, setList] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'schools', profile.schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
      setRefreshing(false);
    });
    return () => unsub();
  }, [profile?.schoolId, refreshTrigger]);

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <Ionicons name="megaphone" size={24} color={colors.primary} style={styles.cardIcon} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.announcementImage} resizeMode="cover" />
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
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No announcements.</Text>}
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
    body: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    announcementImage: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
    documents: { marginTop: 8, gap: 4 },
    docLink: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
