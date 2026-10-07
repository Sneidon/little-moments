import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ColorPalette } from '../theme/colors';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { font } from '../theme/typography';

type NotificationBellButtonProps = {
  onPress: () => void;
  colors: ColorPalette;
  /** 'header' = 48pt round translucent button for the redesign's coloured header block. */
  variant?: 'default' | 'header';
};

export function NotificationBellButton({ onPress, colors, variant = 'default' }: NotificationBellButtonProps) {
  const unreadCount = useUnreadNotificationCount();
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const isHeader = variant === 'header';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={isHeader ? styles.headerButton : styles.hitArea}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Open notifications, ${unreadCount} unread`
          : 'Open notifications'
      }
    >
      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={22} color={isHeader ? '#FFFFFF' : colors.primary} />
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: font.bold,
    textAlign: 'center',
  },
});
