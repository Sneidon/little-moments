import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { StatTile } from '../../../components/brand/StatTile';
import { brandFont } from '../../../theme/typography';
import { radius, spacing, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import type { Child } from '@shared/types';

const firstLetter = (name: string) => name.trim().charAt(0).toUpperCase();

export function AddUpdateCta({ onPress }: { onPress: () => void }) {
  const { brand, category, isDark } = useTheme();
  const styles = useMemo(() => createStyles(brand, category, isDark), [brand, category, isDark]);
  return (
    <TouchableOpacity
      style={styles.cta}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Add Daily Update. Log attendance, meals, or photos"
    >
      <View style={styles.ctaIcon}>
        <Ionicons name="add" size={28} color={category.activity} />
      </View>
      <View style={styles.ctaText}>
        <Text style={styles.ctaTitle}>Add Daily Update</Text>
        <Text style={styles.ctaSubtitle}>Log attendance, meals, or photos</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={category.onCategory} />
    </TouchableOpacity>
  );
}

type AttendanceProps = { children: Child[]; presentIds: Set<string>; meals: number; photos: number };

export function OverviewTiles({ children, presentIds, meals, photos }: AttendanceProps) {
  const { brand, category, isDark } = useTheme();
  const styles = useMemo(() => createStyles(brand, category, isDark), [brand, category, isDark]);
  const total = children.length;
  return (
    <>
      <View style={styles.attendance} accessible accessibilityLabel={`Present: ${presentIds.size} of ${total}. Total students: ${total}`}>
        <View style={styles.ring} pointerEvents="none" />
        <View style={styles.top}>
          <View style={styles.presentCol}>
            <Text style={styles.overline}>Present</Text>
            <Text style={styles.present} numberOfLines={1} adjustsFontSizeToFit>
              {presentIds.size}
              <Text style={styles.suffix}> /{total}</Text>
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Total students</Text>
            <Text style={styles.chipValue}>{total}</Text>
          </View>
        </View>
        {total > 0 ? (
          <View style={styles.dots}>
            {children.map((c) => {
              const present = presentIds.has(c.id);
              return (
                <View key={c.id} style={present ? styles.dotPresent : styles.dotAbsent}>
                  {c.photoURL ? (
                    <Image source={{ uri: c.photoURL }} style={styles.dotPhoto} />
                  ) : (
                    <Text style={present ? styles.dotLetterPresent : styles.dotLetter}>{firstLetter(c.name)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <StatTile size="L" label="Meals logged" value={meals} icon="restaurant-outline" color={category.meal} />
        <StatTile size="L" label="Photos shared" value={photos} icon="image-outline" color={category.photo} />
      </View>
    </>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette, isDark: boolean) {
  const ink = category.onCategory;
  return StyleSheet.create({
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 16,
      paddingLeft: 16,
      paddingRight: 18,
      borderRadius: radius.cardL,
      borderWidth: 3,
      borderColor: brand.background,
      backgroundColor: category.activity,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.7 : 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    ctaIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' },
    ctaText: { flex: 1, minWidth: 0, gap: 2 },
    ctaTitle: { ...typeTokens.cardTitle, color: ink },
    ctaSubtitle: { fontFamily: brandFont.body600, fontSize: 14, color: '#4A3D00' },
    attendance: { backgroundColor: category.attendance, borderRadius: radius.cardL, padding: 22, gap: 18, overflow: 'hidden' },
    ring: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 22,
      borderColor: 'rgba(255,255,255,0.3)',
      right: -50,
      bottom: -60,
    },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    presentCol: { gap: 2, flexShrink: 1 },
    overline: { ...typeTokens.overline, color: ink },
    present: { ...typeTokens.statHero, color: ink },
    suffix: { fontFamily: brandFont.display800, fontSize: 36, letterSpacing: -0.72, color: category.onCategoryMuted },
    chip: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'flex-end' },
    chipLabel: { fontFamily: brandFont.body800, fontSize: 12, letterSpacing: 0.72, textTransform: 'uppercase', color: category.onCategoryMuted },
    chipValue: { fontFamily: brandFont.display800, fontSize: 30, lineHeight: 33, color: ink },
    dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dotAbsent: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2.5,
      borderStyle: 'dashed',
      borderColor: ink,
      opacity: 0.55,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    dotPresent: { width: 34, height: 34, borderRadius: 17, backgroundColor: ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    dotPhoto: { width: '100%', height: '100%' },
    dotLetter: { fontFamily: brandFont.display800, fontSize: 15, color: ink },
    dotLetterPresent: { fontFamily: brandFont.display800, fontSize: 15, color: category.attendance },
    row: { flexDirection: 'row', gap: spacing.gapM },
  });
}
