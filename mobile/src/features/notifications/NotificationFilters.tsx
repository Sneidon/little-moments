import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';
import type { NotificationFilter } from './useUserNotifications';

type Props = {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
  unreadCount: number;
  onMarkAllRead: () => void;
};

export function NotificationFilters({ filter, onChange, unreadCount, onMarkAllRead }: Props) {
  const styles = useThemedStyles(createStyles);
  const chip = (value: NotificationFilter, label: string) => {
    const selected = filter === value;
    return (
      <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={() => onChange(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };
  const disabled = unreadCount === 0;
  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        {chip('all', 'All')}
        {chip('unread', unreadCount ? `Unread (${unreadCount})` : 'Unread')}
      </View>
      <TouchableOpacity onPress={onMarkAllRead} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled }}>
        <Text style={[styles.markAll, disabled && styles.markAllDisabled]}>Mark all as read</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
    chips: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.chip, backgroundColor: brand.surfaceRaised },
    chipSelected: { backgroundColor: brand.inverseFill },
    chipText: { fontFamily: brandFont.body700, fontSize: 14, color: brand.textPrimary },
    chipTextSelected: { color: brand.onInverse },
    markAll: { fontFamily: brandFont.body800, fontSize: 14, color: brand.textPrimary, textDecorationLine: 'underline' },
    markAllDisabled: { color: brand.textTertiary, textDecorationLine: 'none' },
  });
