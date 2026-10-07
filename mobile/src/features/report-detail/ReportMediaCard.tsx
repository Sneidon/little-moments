import React, { useEffect, useState } from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useReportDetailStyles } from './useReportDetailStyles';

const MIN_PHOTO_HEIGHT = 160;
const MAX_PHOTO_HEIGHT = 560;

function useFittedPhotoHeight(uri: string) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [intrinsic, setIntrinsic] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => setIntrinsic(null), [uri]);

  const height =
    intrinsic && boxWidth > 0
      ? Math.round(Math.min(Math.max((boxWidth * intrinsic.h) / intrinsic.w, MIN_PHOTO_HEIGHT), MAX_PHOTO_HEIGHT))
      : null;

  return {
    height,
    onLayout: (e: { nativeEvent: { layout: { width: number } } }) => {
      if (e.nativeEvent.layout.width > 0) setBoxWidth(e.nativeEvent.layout.width);
    },
    onLoad: (e: { nativeEvent: { source: { width: number; height: number } } }) => {
      const { width: w, height: h } = e.nativeEvent.source;
      if (w > 0 && h > 0) setIntrinsic({ w, h });
    },
  };
}

function Photo({ uri }: { uri: string }) {
  const styles = useReportDetailStyles();
  const { height, onLayout, onLoad } = useFittedPhotoHeight(uri);
  return (
    <View style={styles.photoWrap} onLayout={onLayout}>
      <Image
        source={{ uri }}
        style={[styles.photo, height != null ? { height } : styles.photoSizing]}
        resizeMode="contain"
        onLoad={onLoad}
      />
    </View>
  );
}

export function ReportMediaCard({ uri, isVideo }: { uri: string; isVideo: boolean }) {
  const { colors } = useTheme();
  const styles = useReportDetailStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{isVideo ? 'Media' : 'Photo'}</Text>
      {isVideo ? (
        <TouchableOpacity style={styles.videoBtn} onPress={() => Linking.openURL(uri)}>
          <Ionicons name="play-circle" size={40} color={colors.primary} />
          <Text style={styles.videoBtnText}>Open video</Text>
        </TouchableOpacity>
      ) : (
        <Photo uri={uri} />
      )}
    </View>
  );
}
