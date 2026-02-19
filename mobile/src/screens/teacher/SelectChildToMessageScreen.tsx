import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../shared/MessagesListScreen';

type Props = NativeStackScreenProps<MessagesStackParamList, 'SelectChildToMessage'>;

export function SelectChildToMessageScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [startingChatForId, setStartingChatForId] = useState<string | null>(null);

  const schoolId = profile?.schoolId;
  const uid = profile?.uid;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!schoolId || !uid) {
      setLoading(false);
      return;
    }
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
        setLoading(false);
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
          setLoading(false);
          setRefreshing(false);
        }
      );
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [schoolId, uid, refreshTrigger]);

  const onSelectChild = useCallback(
    async (child: Child) => {
      if (!schoolId || !child.parentIds?.length) {
        Alert.alert('No parents', 'This child has no linked parents to message.');
        return;
      }
      const parentId = child.parentIds[0];
      setStartingChatForId(child.id);
      try {
        const { chatId, schoolId: sid } = await getOrCreateChat(schoolId, child.id, parentId);
        navigation.replace('ChatThread', { chatId, schoolId: sid });
      } catch (e) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      } finally {
        setStartingChatForId(null);
      }
    },
    [schoolId, navigation]
  );

  const renderItem = ({ item }: { item: Child }) => {
    const hasParents = item.parentIds && item.parentIds.length > 0;
    const isStarting = startingChatForId === item.id;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelectChild(item)}
        disabled={!hasParents || isStarting}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name
              .trim()
              .split(/\s+/)
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.subtitle}>
            {hasParents ? `Message parent${item.parentIds!.length > 1 ? 's' : ''}` : 'No parents linked'}
          </Text>
        </View>
        {isStarting ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No children assigned to you yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
});
