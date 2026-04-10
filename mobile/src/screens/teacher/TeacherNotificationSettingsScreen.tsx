import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { ColorPalette } from '../../theme/colors';
import { SettingsIconBox, settingsCardShadow } from '../../components/SettingsSection';

export function TeacherNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const cardShadow = useMemo(() => settingsCardShadow(isDark), [isDark]);

  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifCheckIn, setNotifCheckIn] = useState(true);
  const [notifCheckOut, setNotifCheckOut] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    const p = (profile as { notificationPreferences?: Record<string, boolean> } | null)?.notificationPreferences;
    setNotifMessages(p?.messages !== false);
    setNotifAnnouncements(p?.announcements !== false);
    setNotifCheckIn(p?.checkIn !== false);
    setNotifCheckOut(p?.checkOut !== false);
  }, [profile?.uid, profile]);

  const saveTeacherNotifications = useCallback(async () => {
    setNotifSaving(true);
    try {
      const fn = httpsCallable<
        { notificationPreferences: Record<string, boolean> },
        { ok: boolean }
      >(getFunctions(firebaseApp), 'updateTeacherNotificationPreferences');
      await fn({
        notificationPreferences: {
          messages: notifMessages,
          announcements: notifAnnouncements,
          checkIn: notifCheckIn,
          checkOut: notifCheckOut,
        },
      });
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setNotifSaving(false);
    }
  }, [notifMessages, notifAnnouncements, notifCheckIn, notifCheckOut]);

  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >

      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setNotifCheckIn((v) => !v)}
          activeOpacity={0.75}
        >
          <SettingsIconBox name="log-in-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Check in updates</Text>
            <Text style={styles.rowSubtitle}>Alerts when children are checked in</Text>
          </View>
          <Ionicons
            name={notifCheckIn ? 'notifications' : 'notifications-off'}
            size={22}
            color={notifCheckIn ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setNotifCheckOut((v) => !v)}
          activeOpacity={0.75}
        >
          <SettingsIconBox name="log-out-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Check out updates</Text>
            <Text style={styles.rowSubtitle}>Alerts when children are checked out</Text>
          </View>
          <Ionicons
            name={notifCheckOut ? 'notifications' : 'notifications-off'}
            size={22}
            color={notifCheckOut ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setNotifMessages((v) => !v)}
          activeOpacity={0.75}
        >
          <SettingsIconBox name="chatbubbles-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Chat messages</Text>
            <Text style={styles.rowSubtitle}>Alerts for parent and staff conversations</Text>
          </View>
          <Ionicons
            name={notifMessages ? 'notifications' : 'notifications-off'}
            size={22}
            color={notifMessages ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setNotifAnnouncements((v) => !v)}
          activeOpacity={0.75}
        >
          <SettingsIconBox name="megaphone-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Announcements</Text>
            <Text style={styles.rowSubtitle}>School-wide or class posts from your principal</Text>
          </View>
          <Ionicons
            name={notifAnnouncements ? 'notifications' : 'notifications-off'}
            size={22}
            color={notifAnnouncements ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.notifSaveBtn, notifSaving && styles.notifSaveBtnDisabled]}
          onPress={saveTeacherNotifications}
          disabled={notifSaving}
        >
          {notifSaving ? (
            <ActivityIndicator size="small" color={colors.primaryContrast} />
          ) : (
            <Text style={[styles.notifSaveBtnText, { color: colors.primaryContrast }]}>Save preferences</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    intro: {
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 18,
    },
    groupCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 4,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 14,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontFamily: font.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    rowSubtitle: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 3,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 74,
    },
    notifSaveBtn: {
      marginHorizontal: 16,
      marginVertical: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    notifSaveBtnDisabled: { opacity: 0.6 },
    notifSaveBtnText: { fontFamily: font.semiBold, fontSize: 15 },
  });
}
