import React, { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { radius } from '../../theme/tokens';
import { isVideoMedia } from '../../utils/media';
import type { Announcement } from '@shared/types';
import { formatChatListTime } from '../chat/messageList';
import { AnnouncementExpanded } from './AnnouncementExpanded';

type Props = { item: Announcement; unread: boolean; expanded: boolean; onToggle: (item: Announcement) => void };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function chips(item: Announcement): string[] {
  const out: string[] = [];
  if (item.imageUrl) out.push(isVideoMedia(item.mediaType, item.imageUrl) ? 'Video' : 'Photo');
  if (item.documents?.length) out.push(plural(item.documents.length, 'file'));
  if (item.links?.length) out.push(plural(item.links.length, 'link'));
  return out;
}

export const AnnouncementRow = memo(function AnnouncementRow({ item, unread, expanded, onToggle }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const showThumb = !!item.imageUrl && !isVideoMedia(item.mediaType, item.imageUrl);
  const preview = item.body?.trim();
  const tags = chips(item);
  return (
    <TouchableOpacity
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => onToggle(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
    >
      <View style={styles.head}>
        <View style={[styles.tile, { backgroundColor: category.activity }]}>
          {showThumb ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} /> : <Ionicons name="megaphone-outline" size={22} color={category.onCategory} />}
          {unread ? <View style={styles.dot} /> : null}
        </View>
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={[styles.title, !unread && styles.titleRead]} numberOfLines={expanded ? undefined : 2}>
              {item.title}
            </Text>
            <Text style={[styles.time, unread && styles.timeUnread]}>{formatChatListTime(item.createdAt)}</Text>
          </View>
          {!expanded && preview ? (
            <Text style={styles.preview} numberOfLines={2}>
              {preview}
            </Text>
          ) : null}
          {!expanded && tags.length ? (
            <View style={styles.tags}>
              {tags.map((t) => (
                <Text key={t} style={styles.tag}>
                  {t}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={brand.textTertiary} />
      </View>
      {expanded ? <AnnouncementExpanded item={item} /> : null}
    </TouchableOpacity>
  );
});

const createStyles = ({ brand, category }: Theme) =>
  StyleSheet.create({
    card: { padding: 14, borderRadius: radius.card, backgroundColor: brand.surface, borderWidth: 2.5, borderColor: brand.surface },
    cardUnread: { borderColor: brand.textPrimary },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    tile: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    thumb: { width: 52, height: 52, borderRadius: 18 },
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
    body: { flex: 1, minWidth: 0, gap: 4 },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    title: { flex: 1, fontFamily: brandFont.display800, fontSize: 18, lineHeight: 23, letterSpacing: -0.36, color: brand.textPrimary },
    titleRead: { color: brand.textSecondary },
    time: { fontFamily: brandFont.body600, fontSize: 12, color: brand.textTertiary, marginTop: 3 },
    timeUnread: { fontFamily: brandFont.body800, color: brand.textPrimary },
    preview: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    tag: {
      fontFamily: brandFont.body700,
      fontSize: 12,
      color: brand.textSecondary,
      backgroundColor: brand.surfaceRaised,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      overflow: 'hidden',
    },
  });
