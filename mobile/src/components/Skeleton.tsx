import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
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
          opacity: animate ? opacity : 1,
        },
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

/** Chat/conversation list row skeleton (avatar + lines + time) */
export function SkeletonChatRow({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const styles = useSkeletonStyles(colors);
  return (
    <View style={[styles.chatRow, style]}>
      <SkeletonCircle size={48} />
      <View style={styles.chatRowContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} style={{ marginBottom: 4 }} />
        <Skeleton width="75%" height={12} />
      </View>
      <Skeleton width={36} height={12} borderRadius={4} />
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
