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
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getInitials } from '../../utils';
import { getOrCreateChat } from '../../api/chat';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectChildToMessage'>;

export function SelectChildToMessageScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [children, setChildren] = useState<Child[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [startingChildId, setStartingChildId] = useState<string | null>(null);
  const [noAssignedClasses, setNoAssignedClasses] = useState(false);

  const schoolId = profile?.schoolId;
  const uid = profile?.uid;

  const sortedChildren = useMemo(
    () => [...children].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })),
    [children]
  );

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
        setNoAssignedClasses(true);
        setChildren([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setNoAssignedClasses(false);
      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds),
          where('isActive', '==', true)
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
      if (!schoolId) return;
      const parentId = child.parentIds?.[0];
      if (!parentId) {
        Alert.alert('No parent linked', 'This child does not have a linked parent yet.');
        return;
      }
      setStartingChildId(child.id);
      try {
        const { chatId, schoolId: sid } = await getOrCreateChat(schoolId, child.id, parentId);
        navigation.replace('ChatThread', { chatId, schoolId: sid });
      } catch {
        Alert.alert('Error', 'Could not open conversation. Please try again.');
      } finally {
        setStartingChildId(null);
      }
    },
    [schoolId, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Child }) => {
      const hasParent = !!(item.parentIds && item.parentIds.length > 0);
      const isStarting = startingChildId === item.id;
      const className = item.classId ? classNames[item.classId] ?? null : null;

      const cardShadow =
        !isDark && Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
            }
          : {};
      const cardElevation = !isDark && Platform.OS === 'android' ? { elevation: 2 } : {};

      return (
        <TouchableOpacity
          style={[styles.rowCard, cardShadow, cardElevation, !hasParent && styles.rowDisabled]}
          onPress={() => onSelectChild(item)}
          disabled={!hasParent || isStarting}
          activeOpacity={0.72}
        >
          <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
            <Text style={[styles.avatarText, { color: colors.avatarText }]}>
              {getInitials(item.name || '?')}
            </Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.childName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={hasParent ? styles.subtitle : styles.subtitleMuted} numberOfLines={1}>
              {hasParent
                ? className
                  ? className
                  : 'Parent linked'
                : 'No parent linked'}
            </Text>
          </View>
          {isStarting ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.rowTrailing} />
          ) : (
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} style={styles.rowTrailing} />
          )}
        </TouchableOpacity>
      );
    },
    [classNames, colors, isDark, onSelectChild, startingChildId, styles]
  );

  const listEmpty = useMemo(() => {
    if (noAssignedClasses) {
      return (
        <EmptyState
          icon="school-outline"
          title="No classes assigned"
          subtitle="When you’re assigned to a class, children in that class will show up here."
        />
      );
    }
    if (sortedChildren.length === 0 && !loading) {
      return (
        <EmptyState
          icon="people-outline"
          title="No children yet"
          subtitle="There are no children in your classes yet."
        />
      );
    }
    return null;
  }, [noAssignedClasses, sortedChildren.length, loading]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingPad]} accessibilityState={{ busy: true }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonChildPickRow key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedChildren}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    loadingPad: { paddingTop: 8 },
    listContent: {
      flexGrow: 1,
      paddingTop: 8,
      paddingBottom: 28,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontFamily: font.semiBold,
      fontSize: 17,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    childName: {
      fontFamily: font.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    subtitle: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    subtitleMuted: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 4,
    },
    rowTrailing: {
      marginLeft: 8,
    },
  });
}
