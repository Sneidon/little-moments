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
  Platform,
} from 'react-native';
import { SkeletonChildPickRow } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getOrCreateChat } from '../../api/chat';
import { font } from '../../theme/typography';
import { getInitials } from '../../utils';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSelectChildToMessage'>;

type ChildWithTeacher = Child & { teacherId: string | null };

export function ParentSelectChildToMessageScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
            where('parentIds', 'array-contains', uid),
            where('isActive', '==', true)
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
        style={[
          styles.rowCard,
          { borderColor: colors.cardBorder, backgroundColor: colors.card },
          !hasTeacher && styles.rowCardDisabled,
        ]}
        onPress={() => onSelectChild(item)}
        disabled={!hasTeacher || isStarting}
        activeOpacity={0.78}
      >
        <View style={[styles.avatar, { backgroundColor: hasTeacher ? colors.primaryMuted : colors.backgroundSecondary }]}>
          <Text style={[styles.avatarText, { color: hasTeacher ? colors.primary : colors.textMuted }]}>
            {getInitials(item.name || '?')}
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {hasTeacher ? 'Tap to message teacher' : 'Teacher not assigned yet'}
          </Text>
        </View>
        {hasTeacher ? (
          <View style={[styles.statusPill, { backgroundColor: colors.accentTealSoft }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.accentTeal} />
            <Text style={[styles.statusPillText, { color: colors.accentTeal }]}>Available</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="alert-circle-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.statusPillText, { color: colors.textMuted }]}>Unavailable</Text>
          </View>
        )}
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
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="people-outline"
              title="No children linked"
              message="Ask your school to link your child to your parent account."
            />
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    loadingContainer: { paddingTop: 8 },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      paddingTop: 12,
    },
    itemSeparator: { height: 10 },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderWidth: 1,
      borderRadius: 16,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 1 } : {}),
    },
    rowCardDisabled: { opacity: 0.72 },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: { fontFamily: font.bold, fontSize: 16 },
    content: { flex: 1 },
    name: { fontFamily: font.semiBold, fontSize: 16, color: colors.text },
    subtitle: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      marginRight: 8,
    },
    statusPillText: {
      fontFamily: font.semiBold,
      fontSize: 11,
    },
    emptyWrap: { paddingTop: 16 },
  });
}
