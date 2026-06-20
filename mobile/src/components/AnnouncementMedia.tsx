import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isVideoMedia } from '../utils/media';
import type { ColorPalette } from '../theme/colors';

type AnnouncementMediaProps = {
  url: string;
  mediaType?: string;
  colors: ColorPalette;
  variant: 'thumbnail' | 'expanded';
};

export function AnnouncementMedia({ url, mediaType, colors, variant }: AnnouncementMediaProps) {
  const isVideo = isVideoMedia(mediaType, url);

  if (isVideo) {
    const boxStyle = variant === 'thumbnail' ? styles.thumbnail : styles.expanded;
    return (
      <TouchableOpacity
        style={[boxStyle, { backgroundColor: colors.backgroundSecondary }]}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open video"
      >
        <Ionicons name="play-circle" size={variant === 'thumbnail' ? 36 : 48} color={colors.primary} />
        {variant === 'expanded' ? (
          <Text style={[styles.videoLabel, { color: colors.textSecondary }]}>Tap to open video</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={variant === 'thumbnail' ? styles.thumbnail : styles.expanded}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expanded: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
