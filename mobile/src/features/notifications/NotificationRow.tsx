import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';
import { formatChatListTime } from '../chat/messageList';
import { notificationStyle, type NotificationItem } from './notificationDisplay';

type Props = { item: NotificationItem; onPress: (item: NotificationItem) => void };

export const NotificationRow = memo(function NotificationRow({ item, onPress }: Props) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const unread = item.read !== true;
  const look = notificationStyle(item);
  const time = formatChatListTime(item.createdAt);
  return (
    <TouchableOpacity
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || 'Notification'}${unread ? ', unread' : ''}. ${item.body ?? ''}`}
    >
      <View style={[styles.tile, { backgroundColor: category[look.category] }]}>
        <Ionicons name={look.icon} size={22} color={category.onCategory} />
        {unread ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={[styles.title, !unread && styles.titleRead]} numberOfLines={1}>
            {item.title || 'Notification'}
          </Text>
          {time ? <Text style={[styles.time, unread && styles.timeUnread]}>{time}</Text> : null}
        </View>
        {item.body ? (
          <Text style={styles.text} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const createStyles = ({ brand, category }: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: radius.card,
      backgroundColor: brand.surface,
      borderWidth: 2.5,
      borderColor: brand.surface,
    },
    cardUnread: { borderColor: brand.textPrimary },
    tile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dot: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: brand.surface,
      backgroundColor: category.photo,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { flex: 1, fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    titleRead: { fontFamily: brandFont.body700, color: brand.textSecondary },
    time: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary },
    timeUnread: { fontFamily: brandFont.body800, color: brand.textPrimary },
    text: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
  });
