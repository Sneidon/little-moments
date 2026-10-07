import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { NotificationBellButton } from '../../../components/NotificationBellButton';
import { HeaderBlock, Overline } from '../../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../../components/brand/RoundIconButton';
import { brandFont } from '../../../theme/typography';
import { type as typeTokens, type BrandPalette, type CategoryPalette } from '../../../theme/tokens';
import { getInitials } from '../../../utils';

type Props = {
  name: string;
  meta: string;
  photoURL?: string | null;
  dateLabel: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onPickDate: () => void;
  onNotifications: () => void;
};

export function DashboardHeader({ name, meta, photoURL, dateLabel, onPrevDay, onNextDay, onPickDate, onNotifications }: Props) {
  const { colors, brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  return (
    <HeaderBlock paddingBottom={72} gap={30}>
      <View style={styles.profileRow}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(name).slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <NotificationBellButton variant="header" colors={colors} onPress={onNotifications} />
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateText}
          onPress={onPickDate}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Today's overview, ${dateLabel}. Choose a date`}
        >
          <Overline>{"Today's Overview"}</Overline>
          <Text style={styles.date} numberOfLines={1} adjustsFontSizeToFit>
            {dateLabel}
          </Text>
        </TouchableOpacity>
        <View style={styles.dateButtons}>
          <RoundIconButton icon="chevron-back" variant="onHeader" accessibilityLabel="Previous day" onPress={onPrevDay} />
          <RoundIconButton icon="chevron-forward" variant="onHeader" accessibilityLabel="Next day" onPress={onNextDay} />
        </View>
      </View>
    </HeaderBlock>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: category.activity, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 22, color: category.onCategory },
    profileText: { flex: 1, minWidth: 0, gap: 1 },
    name: { fontFamily: brandFont.body800, fontSize: 17, color: brand.onHeader },
    meta: { fontFamily: brandFont.body500, fontSize: 13, color: brand.onHeaderMuted },
    dateRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    dateText: { flex: 1, minWidth: 0, gap: 6 },
    date: { ...typeTokens.displayXL, color: brand.onHeader },
    dateButtons: { flexDirection: 'row', gap: 8 },
  });
}
