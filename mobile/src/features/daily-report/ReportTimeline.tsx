import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { Skeleton } from '../../components/Skeleton';
import { brandFont } from '../../theme/typography';
import { radius, type as typeTokens, updateTypeStyle } from '../../theme/tokens';
import { formatTime } from '../../utils';
import type { ReportWithExtras } from '../../utils/childDailyReportDisplay';
import { getTimelineTitle } from './summary';

type Props = {
  items: ReportWithExtras[];
  loading: boolean;
  refreshing?: boolean;
  emptySubtitle: string;
  onPressItem: (item: ReportWithExtras) => void;
  imageFor?: (item: ReportWithExtras) => string | null | undefined;
};

export function ReportTimeline({ items, loading, refreshing, emptySubtitle, onPressItem, imageFor }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (loading) {
    return (
      <View style={styles.list}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.card}>
            <Skeleton width={48} height={48} borderRadius={16} />
            <View style={styles.content}>
              <Skeleton width="85%" height={16} borderRadius={6} />
              <Skeleton width="50%" height={13} borderRadius={6} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (refreshing) {
    return <ActivityIndicator style={styles.spinner} color={brand.textPrimary} />;
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.shapes} importantForAccessibility="no-hide-descendants">
          <View style={[styles.shapeA, { backgroundColor: category.meal }]} />
          <View style={[styles.shapeB, { backgroundColor: category.nap }]}>
            <Ionicons name="create-outline" size={22} color={category.onCategory} />
          </View>
          <View style={[styles.shapeC, { backgroundColor: category.attendance }]} />
        </View>
        <Text style={styles.emptyTitle}>No updates for this day</Text>
        <Text style={styles.emptyBody}>{emptySubtitle}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const typeStyle = updateTypeStyle(item.type);
        const image = imageFor?.(item);
        const title = getTimelineTitle(item);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onPressItem(item)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`View details: ${title}`}
          >
            <View style={[styles.iconWrap, { backgroundColor: category[typeStyle.category] }]}>
              <Ionicons name={typeStyle.icon} size={22} color={category.onCategory} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              {item.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
              <Text style={styles.time}>{formatTime(item.timestamp || item.createdAt)}</Text>
            </View>
            {image ? <Image source={{ uri: image }} style={styles.thumb} resizeMode="cover" /> : null}
            <Ionicons name="chevron-forward" size={18} color={brand.textTertiary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles({ brand }: Theme) {
  return StyleSheet.create({
    list: { gap: 10 },
    spinner: { paddingVertical: 28 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      padding: 14,
    },
    iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
    notes: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
    time: { fontFamily: brandFont.body700, fontSize: 13, color: brand.textTertiary },
    thumb: { width: 48, height: 48, borderRadius: 14 },
    emptyCard: {
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 10,
    },
    shapes: { width: 120, height: 64, marginBottom: 6 },
    shapeA: {
      position: 'absolute',
      left: 0,
      top: 8,
      width: 48,
      height: 48,
      borderRadius: 16,
      transform: [{ rotate: '-10deg' }],
    },
    shapeB: {
      position: 'absolute',
      left: 36,
      top: 0,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shapeC: {
      position: 'absolute',
      left: 72,
      top: 14,
      width: 44,
      height: 44,
      borderRadius: 14,
      transform: [{ rotate: '12deg' }],
    },
    emptyTitle: { fontFamily: brandFont.display800, fontSize: 22, letterSpacing: -0.44, color: brand.textPrimary, textAlign: 'center' },
    emptyBody: { ...typeTokens.body, color: brand.textSecondary, textAlign: 'center', maxWidth: 280 },
  });
}
