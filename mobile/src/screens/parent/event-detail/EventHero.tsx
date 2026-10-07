import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import { isVideoMedia } from '../../../utils/media';

const DEFAULT_HEIGHT = 220;

function fittedHeight(width: number, intrinsic: { w: number; h: number } | null) {
  if (!intrinsic || intrinsic.w <= 0 || intrinsic.h <= 0) return DEFAULT_HEIGHT;
  return Math.round(Math.min(Math.max((width * intrinsic.h) / intrinsic.w, 180), 520));
}

export function EventHero({ uri, mediaType }: { uri: string; mediaType?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const width = useWindowDimensions().width - 32;
  const [loaded, setLoaded] = useState(false);
  const [intrinsic, setIntrinsic] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setLoaded(false);
    setIntrinsic(null);
  }, [uri]);

  return (
    <View style={styles.card}>
      <View style={[styles.wrap, { width, height: fittedHeight(width, intrinsic) }]}>
        {isVideoMedia(mediaType, uri) ? (
          <TouchableOpacity
            style={[styles.image, styles.video]}
            onPress={() => Linking.openURL(uri)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open video"
          >
            <Ionicons name="play-circle" size={56} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.videoLabel}>Tap to open video</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!loaded ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
            <Image
              source={{ uri }}
              style={[styles.image, { opacity: loaded ? 1 : 0 }]}
              resizeMode="contain"
              onLoad={(e) => {
                const src = e.nativeEvent?.source;
                if (src?.width && src?.height) setIntrinsic({ w: src.width, h: src.height });
                setLoaded(true);
              }}
              onError={() => setLoaded(true)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 14, borderColor: colors.cardBorder, backgroundColor: colors.card },
    wrap: { backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
    loading: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    image: { width: '100%', height: '100%' },
    video: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundSecondary },
    videoLabel: { fontSize: 14, fontFamily: font.medium, color: colors.textSecondary },
  });
