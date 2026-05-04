import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import type { RootStackParamList } from '../../navigation/MainTabs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import {
  SettingsIconBox,
  themeSubtitle,
  themePickerLabel,
  settingsCardShadow,
} from '../../components/SettingsSection';
import { getInitials, formatSettingsVersionFooter } from '../../utils';
import type { ClassRoom } from '../../../../shared/types';
import type { School } from '../../../../shared/types';

export function TeacherSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const cardShadow = useMemo(() => settingsCardShadow(isDark), [isDark]);

  const [className, setClassName] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(false);
  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setClassName(null);
      setSchool(null);
      setSchoolLoading(false);
      return;
    }
    let cancelled = false;
    setSchoolLoading(true);
    setSchool(null);
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
        if (cancelled) return;
        const myClass = snap.docs.find((d) => (d.data() as ClassRoom).assignedTeacherId === uid);
        setClassName(myClass ? (myClass.data() as ClassRoom).name : null);

        const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
        if (cancelled) return;
        if (schoolSnap.exists()) {
          setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
        } else {
          setSchool(null);
        }
      } catch (error) {
        console.error('Error loading school:', error);
      } finally {
        if (!cancelled) setSchoolLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, profile?.uid]);

  const openThemePicker = useCallback(() => {
    Alert.alert('Theme', 'Choose appearance', [
      { text: 'Light', onPress: () => setThemeMode('light') },
      { text: 'Dark', onPress: () => setThemeMode('dark') },
      { text: 'System', onPress: () => setThemeMode('system') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [setThemeMode]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut(auth) },
    ]);
  }, []);

  const onProfilePress = useCallback(() => {
    Alert.alert(
      'Profile',
      'To update your name or photo, contact your school administrator. You can also use the web app if your account has access.'
    );
  }, []);

  const displayName = profile?.displayName?.trim() || 'Teacher';
  const email = profile?.email ?? '-';
  const photoURL = profile?.photoURL;
  const initials = getInitials(displayName);

  const bottomPad = Math.max(insets.bottom, 24);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[styles.profileCard, cardShadow]}
        onPress={onProfilePress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Profile information"
      >
        <View style={styles.avatarWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        {className ? (
          <View style={[styles.classBadge, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.classBadgeText, { color: colors.primary }]} numberOfLines={1}>
              CLASS: {className.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity style={styles.row} onPress={openThemePicker} activeOpacity={0.75}>
          <SettingsIconBox name="contrast-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Theme</Text>
            <Text style={styles.rowSubtitle}>{themeSubtitle(themeMode)}</Text>
          </View>
          <View style={[styles.themePill, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Text style={[styles.themePillText, { color: colors.text }]}>{themePickerLabel(themeMode)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Notifications</Text>
      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('TeacherNotificationSettings')}
          activeOpacity={0.75}
        >
          <SettingsIconBox name="notifications-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Notification settings</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Support</Text>
      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            Alert.alert('FAQ', 'Not implemented yet.')
          }
          activeOpacity={0.75}
        >
          <SettingsIconBox name="help-circle-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>FAQ</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            Alert.alert('Contact support', 'Not implemented yet.')
          }
          activeOpacity={0.75}
        >
          <SettingsIconBox name="headset-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Contact support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {profile?.schoolId ? (
        <>
          <Text style={styles.sectionLabel}>School</Text>
          {schoolLoading ? (
            <View style={[styles.groupCard, cardShadow]}>
              <View style={styles.cardBody}>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted, marginTop: 0 }]}>Loading…</Text>
              </View>
            </View>
          ) : school ? (
            <View style={[styles.groupCard, cardShadow]}>
              <View style={styles.row}>
                <SettingsIconBox
                  name="business-outline"
                  backgroundColor={colors.accentTealSoft}
                  iconColor={colors.accentTeal}
                />
                <Text style={[styles.rowTitle, styles.rowTitleFlex]} numberOfLines={2}>
                  {school.name}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.groupCard, cardShadow]}>
              <View style={styles.cardBody}>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted, marginTop: 0 }]}>
                  Couldn&apos;t load school.
                </Text>
              </View>
            </View>
          )}
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.75}>
          <SettingsIconBox name="log-out-outline" backgroundColor={colors.dangerMuted} iconColor={colors.danger} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex, { color: colors.danger }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>{formatSettingsVersionFooter()}</Text>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sectionLabel: {
      fontFamily: font.semiBold,
      fontSize: 12,
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginTop: 22,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginTop: 4,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 14,
    },
    avatarImg: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      borderColor: colors.cardBorder,
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontFamily: font.bold,
      fontSize: 32,
    },
    profileName: {
      fontFamily: font.bold,
      fontSize: 22,
      color: colors.text,
      textAlign: 'center',
    },
    profileEmail: {
      fontFamily: font.regular,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    classBadge: {
      marginTop: 14,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      maxWidth: '100%',
    },
    classBadgeText: {
      fontFamily: font.semiBold,
      fontSize: 12,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    groupCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 4,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    cardBody: {
      paddingHorizontal: 16,
      paddingVertical: 16,
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
    rowTitleFlex: {
      flex: 1,
    },
    rowSubtitle: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    themePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    themePillText: {
      fontFamily: font.medium,
      fontSize: 14,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 74,
    },
    versionText: {
      fontFamily: font.regular,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 28,
      letterSpacing: 0.3,
    },
  });
}
