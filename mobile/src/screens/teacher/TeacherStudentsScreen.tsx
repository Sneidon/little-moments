import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';

export function TeacherStudentsScreen({
  navigation,
}: {
  navigation: { navigate: (name: string, params?: object) => void; getParent: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [messageLoadingForId, setMessageLoadingForId] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  // Children are assigned by classId; teacher is assigned to class(es) via assignedTeacherId on the class
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
      const classIds = myClasses.map((d) => d.id).slice(0, 10);

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

  const onMessageParent = useCallback(
    async (child: Child) => {
      const schoolId = profile?.schoolId;
      if (!schoolId || !child.parentIds?.length) {
        Alert.alert('No parents', 'This child has no linked parents.');
        return;
      }
      setMessageLoadingForId(child.id);
      try {
        const { chatId, schoolId: sid } = await getOrCreateChat(
          schoolId,
          child.id,
          child.parentIds[0]
        );
        const rootStack = navigation.getParent();
        rootStack?.navigate('ChatThread', { chatId, schoolId: sid });
      } catch (e) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      } finally {
        setMessageLoadingForId(null);
      }
    },
    [profile?.schoolId, navigation]
  );

  const renderChild = ({ item }: { item: Child }) => {
    const hasParents = item.parentIds && item.parentIds.length > 0;
    const isMessageLoading = messageLoadingForId === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.getParent()?.navigate('Reports', { childId: item.id })}
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.primary} style={styles.cardIcon} />
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          {item.allergies?.length ? (
            <Text style={styles.allergies}>Allergies: {item.allergies.join(', ')}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.messageBtn}
          onPress={(e) => {
            e.stopPropagation();
            onMessageParent(item);
          }}
          disabled={!hasParents || isMessageLoading}
        >
          {isMessageLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={hasParents ? colors.primary : colors.textMuted}
            />
          )}
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={renderChild}
        ListEmptyComponent={<Text style={styles.empty}>No children assigned yet.</Text>}
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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardIcon: { marginRight: 12 },
    cardContent: { flex: 1, minWidth: 0 },
    messageBtn: { padding: 8, marginRight: 4 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    allergies: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
