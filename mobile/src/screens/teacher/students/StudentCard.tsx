import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { brandFont } from '../../../theme/typography';
import { avatarCategoryColor, radius, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import { getInitials } from '../../../utils';
import type { Child } from '@shared/types';

type Props = {
  item: Child;
  index: number;
  messageLoading: boolean;
  onOpen: (child: Child) => void;
  onMessageParent: (child: Child) => void;
};

export const StudentCard = memo(function StudentCard({ item, index, messageLoading, onOpen, onMessageParent }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const hasParents = !!item.parentIds && item.parentIds.length > 0;
  const isMessageLoading = messageLoading;
  const allergies = item.allergies ?? [];
  const firstName = item.name.split(' ')[0] ?? item.name;

  return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onOpen(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${
          allergies.length ? `allergies: ${allergies.join(', ')}` : 'no allergies'
        }. Open daily report`}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatarWrap}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
                <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
              </View>
            )}
            {hasParents ? <View style={styles.avatarDot} /> : null}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            {allergies.length ? (
              <Text style={styles.subline}>
                {allergies.length === 1 ? '1 allergy' : `${allergies.length} allergies`}
              </Text>
            ) : (
              <View style={styles.sublineRow}>
                <Ionicons name="checkmark" size={16} color={brand.textSecondary} />
                <Text style={styles.subline}>No allergies</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.messageCircle, !hasParents && styles.messageDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              onMessageParent(item);
            }}
            disabled={!hasParents || isMessageLoading}
            accessibilityRole="button"
            accessibilityLabel={`Message ${firstName}'s parents`}
            accessibilityState={{ disabled: !hasParents || isMessageLoading, busy: isMessageLoading }}
          >
            {isMessageLoading ? (
              <ActivityIndicator size="small" color={brand.onInverse} />
            ) : (
              <Ionicons name="chatbubble-outline" size={20} color={brand.onInverse} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
);
});

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
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
  });
}
