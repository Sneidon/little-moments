import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderItem = ({ item }: { item: Announcement }) => {
    const isExpanded = expandedId === item.id;
    const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: colors.cardBorder }]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Ionicons name="megaphone" size={24} color={colors.primary} style={styles.cardIcon} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
              {item.title}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
          {!isExpanded && item.body?.trim() ? (
            <Text style={styles.bodyPreview} numberOfLines={2}>
              {item.body.trim()}
            </Text>
          ) : null}
          {isExpanded ? (
            <>
              {item.body?.trim() ? <Text style={styles.body}>{item.body.trim()}</Text> : null}
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.announcementImage} resizeMode="cover" />
              ) : null}
              {item.documents && item.documents.length > 0 ? (
                <View style={styles.documents}>
                  {item.documents.map((d, i) =>
                    d.url ? (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(d.url)}>
                        <Text style={styles.docLink}>{d.label || d.name || d.url}</Text>
                      </TouchableOpacity>
                    ) : null
                  )}
                </View>
              ) : null}
            </>
          ) : null}
          <Text style={styles.meta}>{dateLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={expandedId}
        ListEmptyComponent={<Text style={styles.empty}>No announcements.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
    },
    cardIcon: { marginRight: 12 },
    cardContent: { flex: 1, minWidth: 0 },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
    bodyPreview: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
    body: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
    announcementImage: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
    documents: { marginTop: 8, gap: 4 },
    docLink: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
