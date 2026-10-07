import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { brandFont } from '../../../theme/typography';
import { radius, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import type { ClassRoom } from '@shared/types';

function useStyles() {
  const { brand, category } = useTheme();
  return useMemo(() => createStyles(brand, category), [brand, category]);
}

export function BroadcastIntro() {
  const styles = useStyles();
  const { category } = useTheme();
  return (
    <View style={styles.intro}>
      <View style={styles.introIcon}>
        <Ionicons name="megaphone-outline" size={26} color={category.onCategory} />
      </View>
      <Text style={styles.introTitle}>Class broadcast</Text>
      <Text style={styles.introBody}>
        One message is copied into each family’s private chat with you. Parents don’t see each other’s threads.
      </Text>
    </View>
  );
}

export function ClassChooser({ classes, selectedId, onSelect }: { classes: ClassRoom[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const styles = useStyles();
  const { brand } = useTheme();
  return (
    <View style={styles.classes}>
      {classes.map((c) => {
        const selected = selectedId === c.id;
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.classCard, selected && styles.classCardSelected]}
            onPress={() => onSelect(c.id)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Class ${c.name}`}
          >
            <Ionicons name="school-outline" size={22} color={selected ? brand.onInverse : brand.textSecondary} />
            <Text style={[styles.className, selected && styles.classNameSelected]} numberOfLines={2}>
              {c.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function RecipientBar({ text, warn }: { text: string; warn: boolean }) {
  const styles = useStyles();
  const { brand } = useTheme();
  return (
    <View style={[styles.recipients, warn && styles.recipientsWarn]} accessibilityLiveRegion="polite">
      <Ionicons name={warn ? 'alert-circle-outline' : 'people-outline'} size={20} color={brand.textPrimary} />
      <Text style={styles.recipientText}>{text}</Text>
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    intro: { backgroundColor: brand.surface, borderRadius: radius.cardL, padding: 20, gap: 8 },
    introIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: category.activity, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    introTitle: { ...typeTokens.cardTitle, color: brand.textPrimary },
    introBody: { ...typeTokens.body, color: brand.textSecondary },
    classes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    classCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 52,
      paddingHorizontal: 16,
      borderRadius: radius.chip,
      backgroundColor: brand.surface,
    },
    classCardSelected: { backgroundColor: brand.inverseFill },
    className: { fontFamily: brandFont.body700, fontSize: 15, color: brand.textPrimary, flexShrink: 1 },
    classNameSelected: { fontFamily: brandFont.body800, color: brand.onInverse },
    recipients: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.chip, backgroundColor: category.attendance },
    recipientsWarn: { backgroundColor: category.meal },
    recipientText: { flex: 1, fontFamily: brandFont.body700, fontSize: 14, color: category.onCategory },
  });
}
