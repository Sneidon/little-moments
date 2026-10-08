import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { brandFont } from '../../../../theme/typography';
import { radius, type BrandPalette } from '../../../../theme/tokens';

type Props = {
  uri: string | null;
  isVideo: boolean;
  disabled: boolean;
  onPick: () => void;
  onRemove: () => void;
};

export function MediaPicker({ uri, isVideo, disabled, onPick, onRemove }: Props) {
  const { brand } = useTheme();
  const styles = useMemo(() => createStyles(brand), [brand]);

  if (!uri) {
    return (
      <TouchableOpacity style={styles.zone} onPress={onPick} disabled={disabled} accessibilityRole="button">
        <Ionicons name="images-outline" size={48} color={brand.textTertiary} />
        <Text style={styles.zoneHint}>Tap to add photo or video</Text>
        <Text style={styles.zoneFormats}>Take, record, or choose from library</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.preview}>
      <View style={styles.thumbWrap}>
        {isVideo ? (
          <View style={[styles.thumb, styles.videoThumb]}>
            <Ionicons name="play-circle" size={44} color={brand.primaryButton} />
            <Text style={styles.videoText}>Video selected</Text>
          </View>
        ) : (
          <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
        )}
        <View style={styles.badge}>
          <Ionicons name={isVideo ? 'videocam' : 'image'} size={15} color="#FFFFFF" />
          <Text style={styles.badgeText}>{isVideo ? 'Video' : 'Photo'}</Text>
        </View>
        <TouchableOpacity
          style={styles.remove}
          onPress={onRemove}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove media"
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.replace}
        onPress={onPick}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Replace media"
      >
        <Ionicons name="images-outline" size={18} color={brand.textPrimary} />
        <Text style={styles.replaceText}>Replace</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    zone: {
      minHeight: 160,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: brand.disabledBorder,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    zoneHint: { fontSize: 14, fontFamily: brandFont.body700, color: brand.textSecondary, marginTop: 12 },
    zoneFormats: { fontSize: 12, fontFamily: brandFont.body500, color: brand.textTertiary, marginTop: 4 },
    preview: { alignItems: 'center', paddingVertical: 12 },
    thumbWrap: { width: 220, maxWidth: '100%', aspectRatio: 1, borderRadius: radius.chip, overflow: 'hidden', backgroundColor: brand.surfaceRaised },
    thumb: { width: '100%', height: '100%' },
    videoThumb: { alignItems: 'center', justifyContent: 'center' },
    videoText: { fontSize: 13, fontFamily: brandFont.body500, color: brand.textSecondary, marginTop: 8 },
    badge: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: 'rgba(15, 23, 42, 0.78)',
    },
    badgeText: { fontSize: 12, fontFamily: brandFont.body700, color: '#FFFFFF' },
    remove: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.52)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    replace: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, minHeight: 44, paddingHorizontal: 10 },
    replaceText: { fontSize: 15, fontFamily: brandFont.body700, color: brand.textPrimary },
  });
}
