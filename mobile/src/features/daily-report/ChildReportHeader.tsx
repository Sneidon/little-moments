import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HeaderBlock, Overline } from '../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../components/brand/RoundIconButton';
import { DatePill } from '../../components/brand/DatePill';
import { Skeleton } from '../../components/Skeleton';
import { brandFont } from '../../theme/typography';
import { type as typeTokens } from '../../theme/tokens';
import { getAge, getInitials } from '../../utils';
import type { Child } from '@shared/types';

type Props = {
  child: Child | null;
  className: string | null;
  loading: boolean;
  missingMessage: string;
  onBack: () => void;
  datePill: React.ComponentProps<typeof DatePill>;
};

export function ChildReportHeader({ child, className, loading, missingMessage, onBack, datePill }: Props) {
  const { category } = useTheme();
  const ink = category.onCategory;
  const nameParts = child?.name.trim().split(/\s+/) ?? [];

  return (
    <HeaderBlock variant="category" color={category.nap} paddingBottom={26} gap={22}>
      <View style={styles.topRow}>
        <RoundIconButton icon="chevron-back" variant="onHeaderLight" accessibilityLabel="Back" onPress={onBack} />
        <Overline color={ink}>Daily report</Overline>
      </View>

      <View style={styles.profileRow}>
        {loading ? (
          <>
            <Skeleton width={88} height={88} borderRadius={30} />
            <View style={styles.textCol}>
              <Skeleton width="72%" height={30} borderRadius={8} style={{ marginBottom: 10 }} />
              <Skeleton width="48%" height={14} borderRadius={6} />
            </View>
          </>
        ) : !child ? (
          <>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={34} color={ink} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.name, { color: ink }]} accessibilityRole="header">
                Child not found
              </Text>
              <Text style={styles.meta}>{missingMessage}</Text>
            </View>
          </>
        ) : (
          <>
            {child.photoURL ? (
              <Image source={{ uri: child.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={[styles.avatarText, { color: ink }]}>{getInitials(child.name)}</Text>
              </View>
            )}
            <View style={styles.textCol}>
              <Text style={[styles.name, { color: ink }]} accessibilityRole="header" accessibilityLabel={child.name}>
                {nameParts[0]}
                {nameParts.length > 1 ? `\n${nameParts.slice(1).join(' ')}` : ''}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {getAge(child.dateOfBirth)}
                {className ? ` · ${className}` : ''}
              </Text>
            </View>
          </>
        )}
      </View>

      <DatePill {...datePill} />
    </HeaderBlock>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  avatarText: { fontFamily: brandFont.display800, fontSize: 34, letterSpacing: -1 },
  textCol: { flex: 1, minWidth: 0, gap: 6 },
  name: { ...typeTokens.nameL },
  meta: { fontFamily: brandFont.body700, fontSize: 14, color: '#33295A' },
});
