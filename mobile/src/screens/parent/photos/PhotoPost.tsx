import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import { getInitials } from '../../../utils';
import { isVideoMedia } from '../../../utils/media';
import { formatRelativeTime, type PhotoFeedItem } from './photoFeed';

type Props = { item: PhotoFeedItem; onOpen: (item: PhotoFeedItem) => void };

function PostHeader({ item, onPress }: { item: PhotoFeedItem; onPress: () => void }) {
  const { colors } = useTheme();
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
      <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function PhotoPost({ item, onOpen }: Props) {
  const { colors } = useTheme();
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
              <View style={styles.playCircle}>
                <Ionicons name="play" size={36} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.videoLabel}>Video</Text>
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
            <Ionicons name="people" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.tagPillText}>Shared with the whole class</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    card: {
      marginBottom: 20,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      ...(!isDark && Platform.OS === 'ios'
        ? { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.avatarBg },
    avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder },
    avatarInitials: { fontSize: 15, fontFamily: font.bold, color: colors.avatarText },
    headerText: { flex: 1, minWidth: 0 },
    headerName: { fontSize: 15, color: colors.text, fontFamily: font.semiBold },
    headerMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontFamily: font.regular },
    mediaFrame: { width: '100%', backgroundColor: isDark ? '#111' : '#000' },
    mediaFill: { width: '100%', aspectRatio: 1, backgroundColor: isDark ? '#1a1a1c' : colors.skeletonHighlight },
    videoPlaceholder: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
    playCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    videoLabel: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      fontFamily: font.semiBold,
    },
    captionBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
    caption: { fontSize: 14, lineHeight: 20, color: colors.text, fontFamily: font.regular },
    captionName: { fontFamily: font.semiBold, color: colors.text },
    captionBody: { fontFamily: font.regular, color: colors.textSecondary },
    captionMuted: { fontSize: 14, color: colors.textMuted, fontFamily: font.medium, lineHeight: 20 },
    tagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.primaryMuted,
    },
    tagPillText: { fontSize: 12, fontFamily: font.semiBold, color: colors.primary },
  });
