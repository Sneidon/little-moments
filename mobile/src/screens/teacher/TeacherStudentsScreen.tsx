import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOpenChat, NO_PARENTS_ALERT, useTeacherClassChildren, useTabBarClearance } from '../../hooks';
import { TabHeader } from '../../components/brand/TabHeader';
import { StudentCard } from './students/StudentCard';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { BrandSkeletonStudentCard } from '../../components/brand/BrandSkeletons';
import {
  radius,
  spacing,
  type as typeTokens,
  type BrandPalette,
  type CategoryPalette,
} from '../../theme/tokens';
import { brandFont } from '../../theme/typography';
import type { Child } from '@shared/types';

const SKELETON_ROW_KEYS = ['s0', 's1', 's2', 's3'] as const;

export function TeacherStudentsScreen({
  navigation,
}: {
  navigation: { navigate: (name: string, params?: object) => void; getParent: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const { profile } = useAuth();
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const tabBarClearance = useTabBarClearance();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { children, classes, loading } = useTeacherClassChildren(refreshTrigger);
  const { openChat, openingChildId } = useOpenChat();
  const [refreshing, setRefreshing] = useState(false);
  const listLoaded = !loading;
  const roomName = classes.map((c) => c.name).filter(Boolean).join(' · ') || null;

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading, children]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const onMessageParent = useCallback(
    (child: Child) =>
      openChat({
        schoolId: profile?.schoolId,
        childId: child.id,
        otherParticipantId: child.parentIds?.[0],
        ...NO_PARENTS_ALERT,
      }),
    [openChat, profile?.schoolId]
  );

  const students = useMemo(
    () => [...children].sort((a, b) => a.name.localeCompare(b.name)),
    [children]
  );

  const showSkeleton = !listLoaded;
  const listData = showSkeleton ? [...SKELETON_ROW_KEYS] : students;

  return (
    <View style={styles.container}>
      <FlatList<(typeof SKELETON_ROW_KEYS)[number] | Child>
        data={listData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
        renderItem={({ item, index }) =>
          typeof item === 'string' ? (
            <BrandSkeletonStudentCard />
          ) : (
            <StudentCard
              item={item}
              index={index}
              messageLoading={openingChildId === item.id}
              onOpen={(child) => navigation.getParent()?.navigate('Reports', { childId: child.id })}
              onMessageParent={onMessageParent}
            />
          )
        }
        ListHeaderComponent={
          <TabHeader overline={roomName} title="Students" style={styles.header} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.gapM }} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarClearance }]}
        accessibilityState={showSkeleton ? { busy: true } : undefined}
        ListEmptyComponent={
          listLoaded && students.length === 0 ? (
            <EmptyCard icon="people-outline" title="No students yet" body="Students assigned to your class will appear here." />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.onHeader}
            colors={[brand.headerBackground]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: brand.background },
    header: { marginBottom: spacing.gapL },
    listContent: {
      paddingHorizontal: spacing.screenX,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: radius.tile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontFamily: brandFont.display800,
      fontSize: 24,
      letterSpacing: -0.5,
      color: category.onCategory,
    },
    avatarDot: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 3,
      borderColor: brand.surface,
      backgroundColor: brand.statusPresent,
    },
    cardContent: { flex: 1, minWidth: 0, gap: 4 },
    name: { ...typeTokens.cardTitle, lineHeight: 23, color: brand.textPrimary },
    sublineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subline: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
    messageCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: brand.inverseFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageDisabled: { opacity: 0.35 },
    allergyBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: category.meal,
    },
    allergyBandText: { flex: 1, ...typeTokens.label, color: category.onCategory },
  });
}
