import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BrandSkeletonStudentCard } from '../../components/brand/BrandSkeletons';
import { brandFont } from '../../theme/typography';
import { avatarCategoryColor, radius, spacing, type BrandPalette, type CategoryPalette } from '../../theme/tokens';
import { getInitials } from '../../utils';
import type { Child } from '@shared/types';

export type PickableChild = { child: Child; subtitle: string; enabled: boolean };

type Props = {
  items: PickableChild[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  openingChildId: string | null;
  onSelect: (child: Child) => void;
  empty: React.ReactElement | null;
};

export function ChildPickerList({ items, loading, refreshing, onRefresh, openingChildId, onSelect, empty }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.padded]} accessibilityState={{ busy: true }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <BrandSkeletonStudentCard key={i} compact />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(item) => item.child.id}
      contentContainerStyle={styles.padded}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.textPrimary} />}
      ListEmptyComponent={empty}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => {
        const opening = openingChildId === item.child.id;
        return (
          <TouchableOpacity
            style={[styles.row, !item.enabled && styles.disabled]}
            onPress={() => onSelect(item.child)}
            disabled={!item.enabled || opening}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${item.child.name}. ${item.subtitle}`}
            accessibilityState={{ disabled: !item.enabled, busy: opening }}
          >
            <View style={[styles.avatar, { backgroundColor: item.enabled ? avatarCategoryColor(category, index) : brand.disabledAvatar }]}>
              <Text style={styles.avatarText}>{getInitials(item.child.name)}</Text>
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {item.child.name}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            {opening ? <ActivityIndicator size="small" color={brand.textPrimary} /> : <Ionicons name="chevron-forward" size={20} color={brand.textTertiary} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    padded: { flexGrow: 1, padding: spacing.screenX, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: brand.surface },
    disabled: { opacity: 0.5 },
    avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 20, color: category.onCategory },
    text: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontFamily: brandFont.display800, fontSize: 18, letterSpacing: -0.36, color: brand.textPrimary },
    subtitle: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
  });
}
