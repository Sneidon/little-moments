import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { avatarCategoryColor, radius } from '../../../theme/tokens';
import type { Child } from '@shared/types';

type Props = { children: Child[]; selectedId: string | null; onSelect: (id: string) => void };

/** Switches between siblings; hidden for single-child families. */
export function ChildChips({ children, selectedId, onSelect }: Props) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (children.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children.map((c, i) => {
        const selected = selectedId === c.id;
        const firstName = c.name.trim().split(/\s+/)[0] ?? c.name;
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(c.id)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={c.name}
          >
            {c.photoURL ? (
              <Image source={{ uri: c.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, i) }]}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={[styles.name, selected && styles.nameSelected]}>{firstName}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = ({ brand, category }: Theme) =>
  StyleSheet.create({
    row: { gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: 14,
      borderRadius: radius.chip,
      backgroundColor: brand.surface,
    },
    chipSelected: { backgroundColor: brand.inverseFill },
    avatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 15, color: category.onCategory },
    name: { fontFamily: brandFont.body700, fontSize: 14, color: brand.textPrimary },
    nameSelected: { color: brand.onInverse },
  });
