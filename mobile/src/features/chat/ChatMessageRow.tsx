import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, type BrandPalette, type CategoryPalette } from '../../theme/tokens';
import { formatTime } from '../../utils';
import { bubbleRadii, type ChatListItem } from './messageList';

type Props = { item: ChatListItem; myUid: string | undefined; partnerName: string; partnerInitials: string };

export const ChatMessageRow = memo(function ChatMessageRow({ item, myUid, partnerName, partnerInitials }: Props) {
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);

  if (item.type === 'date') {
    return (
      <View style={styles.dateWrap}>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      </View>
    );
  }

  const { message, isFirstInGroup, isLastInGroup, showSenderName, showAvatar } = item;
  const isMe = message.senderId === myUid;
  const bubble = (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, bubbleRadii(isMe, isFirstInGroup, isLastInGroup)]}>
      <Text style={[styles.text, isMe ? styles.textMe : styles.textThem]}>{message.text}</Text>
      {isLastInGroup ? <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>{formatTime(message.createdAt)}</Text> : null}
    </View>
  );
  const marginBottom = isLastInGroup ? 12 : 3;

  if (isMe) {
    return (
      <View style={[styles.rowMe, { marginBottom }]}>
        <View style={styles.colMe}>{bubble}</View>
      </View>
    );
  }
  return (
    <View style={[styles.rowThem, { marginBottom }]}>
      <View style={styles.avatarCol}>
        {showAvatar ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{partnerInitials}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.colThem}>
        {showSenderName ? (
          <Text style={styles.sender} numberOfLines={1}>
            {partnerName}
          </Text>
        ) : null}
        {bubble}
      </View>
    </View>
  );
});

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    dateWrap: { alignItems: 'center', marginVertical: 14 },
    datePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.chip, backgroundColor: brand.surface },
    dateText: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary },
    rowThem: { flexDirection: 'row', alignItems: 'flex-end' },
    rowMe: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' },
    avatarCol: { width: 36, alignItems: 'center', paddingBottom: 2 },
    avatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: category.nap, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: brandFont.display800, fontSize: 11, color: category.onCategory },
    colThem: { marginLeft: 6, maxWidth: '80%', alignItems: 'flex-start' },
    colMe: { maxWidth: '80%', alignItems: 'flex-end' },
    sender: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary, marginBottom: 4, marginLeft: 2 },
    bubble: { paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
    bubbleMe: { backgroundColor: brand.primaryButton },
    bubbleThem: { backgroundColor: brand.surface },
    text: { fontFamily: brandFont.body400, fontSize: 16, lineHeight: 21 },
    textMe: { color: brand.onPrimaryButton },
    textThem: { color: brand.textPrimary },
    time: { fontFamily: brandFont.body400, fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
    timeMe: { color: brand.onPrimaryButton, opacity: 0.72 },
    timeThem: { color: brand.textTertiary },
  });
}
