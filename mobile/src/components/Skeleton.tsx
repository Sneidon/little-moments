import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type DimensionValue = number | `${number}%` | 'auto';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  animate?: boolean;
};

export function Skeleton({
  width,
  height = 16,
  borderRadius = 6,
  style,
  animate = true,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        animate ? { opacity } : { opacity: 1 },
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Inbox / messages tab: action pills while loading */
export function SkeletonMessagesActionHeader({
  variant,
  style,
}: {
  variant: 'teacher' | 'parent' | 'none';
  style?: ViewStyle;
}) {
  const { colors, isDark } = useTheme();
  if (variant === 'none') return null;
  const pill = {
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
    borderColor: colors.cardBorder,
  } as const;
  if (variant === 'teacher') {
    return (
      <View style={[{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }, style]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={pill.height} borderRadius={pill.borderRadius} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={pill.height} borderRadius={pill.borderRadius} />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }, style]}>
      <Skeleton width="100%" height={pill.height} borderRadius={pill.borderRadius} />
    </View>
  );
}

/** Chat/conversation list row; matches inbox message cards (avatar + name/time + child + preview + chevron) */
export function SkeletonMessageListRow({ style }: { style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.cardBorder,
          ...(!isDark && Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
              }
            : {}),
          ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
        },
        style,
      ]}
    >
      <SkeletonCircle size={52} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Skeleton width="52%" height={16} borderRadius={4} />
          <Skeleton width="22%" height={12} borderRadius={4} />
        </View>
        <Skeleton width="36%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width="92%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={14} height={18} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
  );
}

/** @deprecated Use SkeletonMessageListRow; kept for any legacy imports */
export function SkeletonChatRow({ style }: { style?: ViewStyle }) {
  return <SkeletonMessageListRow style={style} />;
}

/** Start conversation: hero + search bar */
export function SkeletonConversationPickerHeader({ style }: { style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }, style]}>
      <Skeleton width="72%" height={20} borderRadius={6} style={{ marginBottom: 10 }} />
      <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="88%" height={13} borderRadius={4} style={{ marginBottom: 14 }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 12 : 10,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.cardBorder,
        }}
      >
        <Skeleton width={20} height={20} borderRadius={10} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="100%" height={18} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

/** Start conversation: one parent/child row */
export function SkeletonConversationPickerRow({ style }: { style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.cardBorder,
          ...(!isDark && Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
              }
            : {}),
          ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
        },
        style,
      ]}
    >
      <SkeletonCircle size={52} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Skeleton width="58%" height={16} borderRadius={4} />
        <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={11} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={14} height={18} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
  );
}

/** Teacher Students tab: student card (avatar + lines + message button) */
export function SkeletonStudentListRow({ style }: { style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...(!isDark
            ? Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                },
                android: { elevation: 2 },
                default: {},
              })
            : {}),
        },
        style,
      ]}
    >
      <SkeletonCircle size={52} />
      <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
        <Skeleton width="62%" height={14} borderRadius={6} />
        <Skeleton width="44%" height={10} borderRadius={5} style={{ marginTop: 10 }} />
      </View>
      <Skeleton width={48} height={48} borderRadius={14} style={{ marginLeft: 8 }} />
    </View>
  );
}

/** Parent “Message teacher” picker row */
export function SkeletonChildPickRow({ style }: { style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
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
        style,
      ]}
    >
      <SkeletonCircle size={52} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Skeleton width="55%" height={16} borderRadius={4} />
        <Skeleton width="48%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={14} height={18} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
  );
}

/** Child/student list row skeleton */
export function SkeletonChildRow({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const styles = useSkeletonStyles(colors);
  return (
    <View style={[styles.childRow, style]}>
      <SkeletonCircle size={44} />
      <View style={styles.childRowContent}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const cardStyles = (colors: import('../theme/colors').ColorPalette) => ({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginHorizontal: 4,
    backgroundColor: colors.card,
  },
  studentCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  studentCardContent: { flex: 1, marginLeft: 12 },
});

/** Card skeleton for events/announcements */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const s = cardStyles(colors);
  return (
    <View style={[s.card, style]}>
      <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="90%" height={14} style={{ marginBottom: 12 }} />
      <Skeleton width={100} height={12} />
    </View>
  );
}

/** Dashboard stat card skeleton */
export function SkeletonStatCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const s = cardStyles(colors);
  return (
    <View style={[s.statCard, style]}>
      <Skeleton width={32} height={24} style={{ marginBottom: 4 }} />
      <Skeleton width={48} height={12} />
    </View>
  );
}

/** Dashboard student card skeleton */
export function SkeletonStudentCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const s = cardStyles(colors);
  return (
    <View style={[s.studentCard, style]}>
      <SkeletonCircle size={48} />
      <View style={s.studentCardContent}>
        <Skeleton width={100} height={16} style={{ marginBottom: 6 }} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

function useSkeletonStyles(colors: import('../theme/colors').ColorPalette) {
  return StyleSheet.create({
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chatRowContent: { flex: 1, marginLeft: 12, minWidth: 0 },
    childRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    childRowContent: { flex: 1, marginLeft: 12 },
  });
}
