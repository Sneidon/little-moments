import React, { useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { isVideoMedia } from '../../utils/media';

const MIN_RATIO = 0.6;
const MAX_RATIO = 1.6;

export function MediaBlock({ url, mediaType }: { url: string; mediaType?: string }) {
  const { category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [ratio, setRatio] = useState(4 / 3);

  if (isVideoMedia(mediaType, url)) {
    return (
      <TouchableOpacity style={styles.video} onPress={() => Linking.openURL(url)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Play video">
        <View style={[styles.play, { backgroundColor: category.activity }]}>
          <Ionicons name="play" size={30} color={category.onCategory} style={{ marginLeft: 4 }} />
        </View>
        <Text style={styles.videoLabel}>Tap to play video</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.9} accessibilityRole="imagebutton" accessibilityLabel="Open image">
      <Image
        source={{ uri: url }}
        style={[styles.image, { aspectRatio: ratio }]}
        resizeMode="cover"
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width > 0 && height > 0) setRatio(Math.min(Math.max(width / height, MIN_RATIO), MAX_RATIO));
        }}
      />
    </TouchableOpacity>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    image: { width: '100%', borderRadius: 20, backgroundColor: brand.surfaceRaised },
    video: { height: 190, borderRadius: 20, backgroundColor: brand.surfaceRaised, alignItems: 'center', justifyContent: 'center', gap: 10 },
    play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    videoLabel: { fontFamily: brandFont.body700, fontSize: 14, color: brand.textSecondary },
  });
