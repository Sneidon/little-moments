import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { avatarCategoryColor, radius, type BrandPalette, type CategoryPalette } from '../../theme/tokens';
import { getInitials } from '../../utils';
import { formatChatListTime } from './messageList';
import type { ChatWithNames } from './useChatList';

type Props = { chat: ChatWithNames; index: number; unread: boolean; onPress: (chat: ChatWithNames) => void };

export const ChatListRow = memo(function ChatListRow({ chat, index, unread, onPress }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const preview = chat.lastMessageText?.trim();
  const time = formatChatListTime(chat.lastMessageAt || chat.updatedAt);
  return (
    <TouchableOpacity
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => onPress(chat)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${chat.otherDisplayName}, about ${chat.childName}${unread ? ', unread' : ''}. ${preview || 'No messages yet'}`}
    >
      <View style={[styles.avatar, { backgroundColor: avatarCategoryColor(category, index) }]}>
        <Text style={styles.avatarText}>{getInitials(chat.otherDisplayName === '…' ? '?' : chat.otherDisplayName)}</Text>
        {unread ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.otherDisplayName}
          </Text>
          {time ? <Text style={[styles.time, unread && styles.timeUnread]}>{time}</Text> : null}
        </View>
        <Text style={styles.child} numberOfLines={1}>
          {chat.childName}
        </Text>
        <Text style={preview ? [styles.preview, unread && styles.previewUnread] : styles.previewEmpty} numberOfLines={2}>
          {preview || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
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
    avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 20, color: category.onCategory },
    dot: {
      position: 'absolute',
      right: -4,
      top: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 3,
      borderColor: brand.surface,
      backgroundColor: category.photo,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1, fontFamily: brandFont.display800, fontSize: 18, letterSpacing: -0.36, color: brand.textPrimary },
    time: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary },
    timeUnread: { fontFamily: brandFont.body800, color: brand.textPrimary },
    child: { fontFamily: brandFont.body700, fontSize: 13, color: brand.textSecondary },
    preview: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
    previewUnread: { fontFamily: brandFont.body700, color: brand.textPrimary },
    previewEmpty: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, fontStyle: 'italic', color: brand.textTertiary },
  });
}
