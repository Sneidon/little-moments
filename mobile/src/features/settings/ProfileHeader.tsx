import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HeaderBlock, Overline } from '../../components/brand/HeaderBlock';
import { brandFont } from '../../theme/typography';
import { radius, type BrandPalette, type CategoryPalette } from '../../theme/tokens';
import { getInitials } from '../../utils';

type Props = {
  overline: string;
  name: string;
  email: string;
  photoURL?: string | null;
  chip?: string | null;
  onPress: () => void;
};

export function ProfileHeader({ overline, name, email, photoURL, chip, onPress }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  return (
    <HeaderBlock paddingBottom={30} gap={18}>
      <Overline>{overline}</Overline>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${email}. Profile`}
      >
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.initials}>{getInitials(name)}</Text>
          </View>
        )}
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          {chip ? (
            <View style={styles.chip}>
              <Ionicons name="school-outline" size={14} color={category.onCategory} />
              <Text style={styles.chipText} numberOfLines={1}>
                {chip}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </HeaderBlock>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 30,
      backgroundColor: category.activity,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-4deg' }],
    },
    initials: { fontFamily: brandFont.display800, fontSize: 34, letterSpacing: -1, color: category.onCategory },
    text: { flex: 1, minWidth: 0, gap: 4 },
    name: { fontFamily: brandFont.display800, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: brand.onHeader },
    email: { fontFamily: brandFont.body500, fontSize: 14, color: brand.onHeaderMuted },
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: category.activity,
      maxWidth: '100%',
    },
    chipText: { fontFamily: brandFont.body800, fontSize: 13, color: category.onCategory, flexShrink: 1 },
  });
}
