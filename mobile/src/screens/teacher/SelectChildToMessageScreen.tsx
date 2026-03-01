import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SkeletonChildRow } from '../../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { UserProfile } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../shared/MessagesListScreen';

type Props = NativeStackScreenProps<MessagesStackParamList, 'SelectChildToMessage'>;

/** One row: parent + child = one chat conversation. */
type ParentChildRow = {
  parentId: string;
  parentDisplayName: string;
  child: Child;
};

export function SelectChildToMessageScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [children, setChildren] = useState<Child[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [parentRows, setParentRows] = useState<ParentChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [startingKey, setStartingKey] = useState<string | null>(null);

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
      const names: Record<string, string> = {};
      myClasses.forEach((d) => {
        const c = d.data() as ClassRoom;
        names[d.id] = c.name ?? d.id;
      });
      setClassNames(names);
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

  useEffect(() => {
    if (children.length === 0) {
      setParentRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows: ParentChildRow[] = [];
      const parentIds = new Set<string>();
      for (const child of children) {
        for (const parentId of child.parentIds ?? []) {
          parentIds.add(parentId);
        }
      }
      const parentProfiles: Record<string, string> = {};
      await Promise.all(
        Array.from(parentIds).map(async (parentId) => {
          if (cancelled) return;
          try {
            const snap = await getDoc(doc(db, 'users', parentId));
            if (snap.exists()) {
              const p = snap.data() as UserProfile;
              parentProfiles[parentId] = p.displayName || p.preferredName || parentId.slice(0, 8);
            } else {
              parentProfiles[parentId] = parentId.slice(0, 8);
            }
          } catch {
            parentProfiles[parentId] = parentId.slice(0, 8);
          }
        })
      );
      if (cancelled) return;
      for (const child of children) {
        for (const parentId of child.parentIds ?? []) {
          rows.push({
            parentId,
            parentDisplayName: parentProfiles[parentId] ?? parentId.slice(0, 8),
            child,
          });
        }
      }
      rows.sort((a, b) => {
        const nameA = a.parentDisplayName.toLowerCase();
        const nameB = b.parentDisplayName.toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.child.name ?? '').localeCompare(b.child.name ?? '');
      });
      setParentRows(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [children]);

  const onSelect = useCallback(
    async (row: ParentChildRow) => {
      if (!schoolId) return;
      const key = `${row.parentId}_${row.child.id}`;
      setStartingKey(key);
      try {
        const { chatId, schoolId: sid } = await getOrCreateChat(schoolId, row.child.id, row.parentId);
        navigation.replace('ChatThread', { chatId, schoolId: sid });
      } catch (e) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      } finally {
        setStartingKey(null);
      }
    },
    [schoolId, navigation]
  );

  const renderItem = ({ item }: { item: ParentChildRow }) => {
    const key = `${item.parentId}_${item.child.id}`;
    const isStarting = startingKey === key;
    const className = item.child.classId ? classNames[item.child.classId] ?? item.child.classId : null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelect(item)}
        disabled={isStarting}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.parentDisplayName
              .trim()
              .split(/\s+/)
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{item.parentDisplayName}</Text>
          <Text style={styles.subtitle}>
            {item.child.name}{className ? ` · ${className}` : ''}
          </Text>
        </View>
        {isStarting ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonChildRow key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parentRows}
        keyExtractor={(item) => `${item.parentId}_${item.child.id}`}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No parents linked to children in your classes yet.</Text>
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 16, fontWeight: '600', color: colors.primaryContrast },
    content: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
  });
}
