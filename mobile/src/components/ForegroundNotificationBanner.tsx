import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { subscribeForegroundNotificationBanner, type ForegroundBannerPayload, type NotificationData } from '../services/notifications';

const AUTO_HIDE_MS = 30000;

export function ForegroundNotificationBanner({ onOpen }: { onOpen: (data: NotificationData) => boolean }) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<ForegroundBannerPayload | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeForegroundNotificationBanner((payload) => {
      setBanner(payload);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setBanner(null), AUTO_HIDE_MS);
    });
    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!banner) return null;

  return (
    <View style={[styles.banner, { top: Math.max(insets.top, 10), backgroundColor: isDark ? '#1f2937' : '#111827' }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => banner.data && onOpen(banner.data) && setBanner(null)}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel="Open notification details"
      >
        <Text style={styles.title} numberOfLines={1}>
          {banner.title}
        </Text>
        {banner.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {banner.body}
          </Text>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={() => setBanner(null)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification banner"
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  main: { flex: 1, minWidth: 0 },
  dismiss: { marginLeft: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)' },
  dismissText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  title: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  body: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2, fontFamily: 'Inter_400Regular' },
});
