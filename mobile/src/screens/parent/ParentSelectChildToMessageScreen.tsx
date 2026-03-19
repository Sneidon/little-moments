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
import { SkeletonChildPickRow } from '../../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSelectChildToMessage'>;

type ChildWithTeacher = Child & { teacherId: string | null };

export function ParentSelectChildToMessageScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [children, setChildren] = useState<ChildWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [startingChildId, setStartingChildId] = useState<string | null>(null);

  const uid = profile?.uid;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    (async () => {
      const list: ChildWithTeacher[] = [];
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      for (const schoolDoc of schoolsSnap.docs) {
        const schoolId = schoolDoc.id;
        const childrenSnap = await getDocs(
          query(
            collection(db, 'schools', schoolId, 'children'),
            where('parentIds', 'array-contains', uid)
          )
        );
        for (const childDoc of childrenSnap.docs) {
          const child = { id: childDoc.id, ...childDoc.data() } as Child;
          let teacherId = child.assignedTeacherId ?? null;
          if (!teacherId && child.classId) {
            const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', child.classId));
            const classData = classSnap.exists() ? (classSnap.data() as ClassRoom) : null;
            teacherId = classData?.assignedTeacherId ?? null;
          }
          list.push({ ...child, teacherId });
        }
      }
      setChildren(list);
      setLoading(false);
      setRefreshing(false);
    })();
  }, [uid, refreshTrigger]);

  const onSelectChild = useCallback(
    async (child: ChildWithTeacher) => {
      if (!child.teacherId) {
        Alert.alert('No teacher assigned', 'This child does not have an assigned teacher yet.');
        return;
      }
      setStartingChildId(child.id);
      try {
        const { chatId, schoolId } = await getOrCreateChat(
          child.schoolId,
          child.id,
          child.teacherId
        );
        navigation.navigate('ChatThread', { chatId, schoolId });
      } catch (e) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
      } finally {
        setStartingChildId(null);
      }
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: ChildWithTeacher }) => {
    const hasTeacher = !!item.teacherId;
    const isStarting = startingChildId === item.id;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelectChild(item)}
        disabled={!hasTeacher || isStarting}
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
            {hasTeacher ? 'Message teacher' : 'No teacher assigned'}
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
      <View style={[styles.container, styles.loadingContainer]} accessibilityState={{ busy: true }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonChildPickRow key={i} />
        ))}
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
          <Text style={styles.empty}>No children linked to your account yet.</Text>
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    loadingContainer: { paddingTop: 8 },
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
