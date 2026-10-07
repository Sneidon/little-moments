import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { brandFont } from '../../../theme/typography';
import { avatarCategoryColor, radius, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import { getAge, getInitials } from '../../../utils';
import type { Child } from '@shared/types';

type Props = { children: Child[]; presentIds: Set<string>; onPress: (child: Child) => void };

export function StudentPresenceList({ children, presentIds, onPress }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  if (children.length === 0) return <Text style={styles.empty}>No children assigned yet.</Text>;
  return (
    <>
      {children.map((child, index) => {
        const present = presentIds.has(child.id);
        const age = getAge(child.dateOfBirth);
        return (
          <TouchableOpacity
            key={child.id}
            style={styles.card}
            onPress={() => onPress(child)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${child.name}, ${age} old, ${present ? 'present' : 'not checked in'}`}
          >
            <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
              <Text style={styles.avatarText}>{getInitials(child.name)}</Text>
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {child.name}
              </Text>
              <Text style={styles.age}>{age} old</Text>
            </View>
            <View style={[styles.badge, !present && styles.badgeAbsent]}>
              <Text style={[styles.badgeText, !present && styles.badgeTextAbsent]}>{present ? 'Present' : '-'}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    empty: { ...typeTokens.body, color: brand.textSecondary, marginHorizontal: 4 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: brand.surface },
    avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 20, color: category.onCategory },
    text: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontFamily: brandFont.display800, fontSize: 18, letterSpacing: -0.36, color: brand.textPrimary },
    age: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: brand.statusPresent },
    badgeAbsent: { backgroundColor: brand.surfaceRaised },
    badgeText: { fontFamily: brandFont.body800, fontSize: 13, color: '#FFFFFF' },
    badgeTextAbsent: { color: brand.textTertiary },
  });
}
