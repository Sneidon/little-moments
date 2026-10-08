import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius } from '../../../theme/tokens';
import { getInitials } from '../../../utils';
import { isVideoMedia } from '../../../utils/media';
import { formatRelativeTime, type PhotoFeedItem } from './photoFeed';

type Props = { item: PhotoFeedItem; onOpen: (item: PhotoFeedItem) => void };

function PostHeader({ item, onPress }: { item: PhotoFeedItem; onPress: () => void }) {
  const { brand } = useTheme();
  const styles = useThemedStyles(createStyles);
  const when = formatRelativeTime(item.timestamp);
  return (
    <TouchableOpacity
      style={styles.header}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.childName}, ${when}`}
    >
      {item.childPhotoURL ? (
        <Image source={{ uri: item.childPhotoURL }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{getInitials(item.childName)}</Text>
        </View>
      )}
      <View style={styles.headerText}>
        <Text style={styles.headerName} numberOfLines={1}>
          {item.childName}
        </Text>
        <Text style={styles.headerMeta} numberOfLines={1}>
          {when ? `${when} · ` : ''}
          {item.photoCategory ?? 'Moment from school'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={brand.textTertiary} />
    </TouchableOpacity>
  );
}

export function PhotoPost({ item, onOpen }: Props) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isVideo = isVideoMedia(item.mediaType, item.imageUrl);
  const open = () => onOpen(item);

  return (
    <View style={styles.card}>
      <PostHeader item={item} onPress={open} />
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.95}
        accessibilityRole="imagebutton"
        accessibilityLabel={isVideo ? 'Video, tap for details' : 'Media, tap for details'}
      >
        <View style={styles.mediaFrame}>
          {isVideo ? (
            <View style={[styles.mediaFill, styles.videoPlaceholder]}>
              <View style={[styles.playCircle, { backgroundColor: category.activity }]}>
                <Ionicons name="play" size={32} color={category.onCategory} style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.videoLabel}>Tap to view video</Text>
            </View>
          ) : (
            <Image source={{ uri: item.imageUrl }} style={styles.mediaFill} resizeMode="cover" />
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={open} activeOpacity={0.9} style={styles.captionBlock}>
        {item.notes ? (
          <Text style={styles.caption}>
            <Text style={styles.captionName}>{item.childName}</Text>
            <Text style={styles.captionBody}> {item.notes}</Text>
          </Text>
        ) : (
          <Text style={styles.captionMuted}>Tap to view details and full caption.</Text>
        )}
        {item.forWholeClass ? (
          <View style={styles.tagPill}>
            <Ionicons name="people-outline" size={15} color={brand.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.tagPillText}>Shared with the whole class</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = ({ brand, category }: Theme) =>
  StyleSheet.create({
    card: { marginBottom: 14, borderRadius: radius.card, overflow: 'hidden', backgroundColor: brand.surface },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: category.photo },
    avatarImg: { width: 44, height: 44, borderRadius: 14 },
    avatarInitials: { fontSize: 17, fontFamily: brandFont.display800, color: category.onCategory },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    headerName: { fontSize: 15, color: brand.textPrimary, fontFamily: brandFont.body800 },
    headerMeta: { fontSize: 13, color: brand.textTertiary, fontFamily: brandFont.body700 },
    mediaFrame: { width: '100%', backgroundColor: brand.surfaceRaised },
    mediaFill: { width: '100%', aspectRatio: 1, backgroundColor: brand.surfaceRaised },
    videoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 10 },
    playCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    videoLabel: { fontSize: 14, color: brand.textSecondary, fontFamily: brandFont.body700 },
    captionBlock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
    caption: { fontSize: 15, lineHeight: 22, color: brand.textPrimary, fontFamily: brandFont.body500 },
    captionName: { fontFamily: brandFont.body800, color: brand.textPrimary },
    captionBody: { fontFamily: brandFont.body500, color: brand.textSecondary },
    captionMuted: { fontSize: 14, color: brand.textTertiary, fontFamily: brandFont.body600, lineHeight: 20 },
    tagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    tagPillText: { fontSize: 13, fontFamily: brandFont.body700, color: brand.textSecondary },
  });
