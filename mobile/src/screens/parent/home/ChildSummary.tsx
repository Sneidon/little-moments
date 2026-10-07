import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Skeleton } from '../../../components/Skeleton';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import { getAge, getInitials } from '../../../utils';
import type { Child } from '@shared/types';

function metaLine(child: Child, className: string | null) {
  const age = getAge(child.dateOfBirth);
  const cls = className?.trim();
  if (age && cls) return `${age} · ${cls}`;
  return cls || age || 'Your child';
}

type CardProps = { child: Child | undefined; className: string | null; onPress: () => void };

export function ChildSummaryCard({ child, className, onPress }: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={child ? 0.92 : 1}
      disabled={!child}
      accessibilityRole="button"
      accessibilityLabel="Open daily report for this child"
    >
      {child?.photoURL ? (
        <Image source={{ uri: child.photoURL }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child ? getInitials(child.name) : '…'}</Text>
        </View>
      )}
      <View style={styles.textCol}>
        {child?.name ? (
          <Text style={styles.name} numberOfLines={1}>
            {child.name}
          </Text>
        ) : (
          <Skeleton width={160} height={18} style={{ marginBottom: 8 }} />
        )}
        <Text style={styles.meta} numberOfLines={1}>
          {child ? metaLine(child, className) : ' '}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type ChipsProps = { children: Child[]; selectedId: string | null; onSelect: (id: string) => void };

export function ChildChips({ children, selectedId, onSelect }: ChipsProps) {
  const styles = useThemedStyles(createStyles);
  if (children.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContent}
      style={styles.chipsScroll}
    >
      {children.map((c) => {
        const active = selectedId === c.id;
        return (
          <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(c.id)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.avatarBg,
    },
    avatarImg: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.cardBorder },
    avatarText: { fontSize: 18, fontFamily: font.bold, color: colors.avatarText },
    textCol: { flex: 1, marginLeft: 14, minWidth: 0 },
    name: { fontSize: 17, fontFamily: font.bold, color: colors.text },
    meta: { fontSize: 14, marginTop: 4, fontFamily: font.regular, color: colors.textMuted },
    chipsScroll: { marginTop: 10, maxHeight: 44 },
    chipsContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    chipText: { fontSize: 14, color: colors.textSecondary, fontFamily: font.medium },
    chipTextActive: { color: colors.primary, fontFamily: font.semiBold },
  });
