import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import {
  SettingsIconBox,
  themeSubtitle,
  themePickerLabel,
  settingsCardShadow,
} from '../../components/SettingsSection';
import { getAge, getInitials, formatSettingsVersionFooter } from '../../utils';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { School } from '../../../../shared/types';

export function ParentSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { profile, selectedChildId } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const cardShadow = useMemo(() => settingsCardShadow(isDark), [isDark]);

  const [children, setChildren] = useState<Child[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    (async () => {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const list: Child[] = [];
      for (const schoolDoc of schoolsSnap.docs) {
        const q = query(
          collection(db, 'schools', schoolDoc.id, 'children'),
          where('parentIds', 'array-contains', uid)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
      }
      setChildren(list);
      const firstSchoolId = list[0]?.schoolId;
      if (firstSchoolId) {
        const schoolSnap = await getDoc(doc(db, 'schools', firstSchoolId));
        if (schoolSnap.exists()) setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
      }
    })();
  }, [profile?.uid]);

  useEffect(() => {
    const schoolIds = [...new Set(children.map((c) => c.schoolId))];
    if (schoolIds.length === 0) return;
    (async () => {
      const names: Record<string, string> = {};
      for (const sid of schoolIds) {
        const classesSnap = await getDocs(collection(db, 'schools', sid, 'classes'));
        classesSnap.docs.forEach((d) => {
          const c = d.data() as ClassRoom;
          names[c.id] = c.name;
        });
      }
      setClassNames(names);
    })();
  }, [children]);

  const selectedChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId)
    : children[0];
  const className = selectedChild?.classId ? classNames[selectedChild.classId] ?? selectedChild.classId : null;

  const navigate = useCallback(
    (name: string) => (navigation as { navigate: (n: string) => void }).navigate(name),
    [navigation]
  );

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

  const displayName = profile?.displayName?.trim() || 'Parent';
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
        onPress={() => navigate('ParentProfile')}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <View style={styles.avatarWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
          <View style={[styles.editFab, { backgroundColor: colors.primary }]}>
            <Ionicons name="pencil" size={16} color={colors.primaryContrast} />
          </View>
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

      <Text style={styles.sectionLabel}>Support</Text>
      <View style={[styles.groupCard, cardShadow]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            Alert.alert(
              'FAQ',
              'Common questions: How do I see updates for my child? Open Home. How do I message the teacher? Use Messages. Need more? Tap Contact support.'
            )
          }
          activeOpacity={0.75}
        >
          <SettingsIconBox name="help-circle-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>FAQ</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity style={styles.row} onPress={() => navigate('ParentNotifications')} activeOpacity={0.75}>
          <SettingsIconBox name="notifications-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.hairline, { backgroundColor: colors.cardBorder }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            Alert.alert('Contact support', 'Email: support@mylittlemoments.com\n\nWe respond within 1-2 business days.')
          }
          activeOpacity={0.75}
        >
          <SettingsIconBox name="headset-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Contact support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {selectedChild ? (
        <>
          <Text style={styles.sectionLabel}>Family</Text>
          <View style={[styles.groupCard, cardShadow]}>
            <View style={styles.cardBody}>
              <Text style={styles.rowTitle}>{selectedChild.name}</Text>
              <Text style={styles.rowSubtitle}>
                {getAge(selectedChild.dateOfBirth)} old
                {className ? ` · ${className}` : ''}
              </Text>
              {selectedChild.allergies?.length ? (
                <View style={styles.tagRow}>
                  {selectedChild.allergies.map((a) => (
                    <View key={a} style={[styles.tag, { backgroundColor: colors.dangerMuted }]}>
                      <Text style={[styles.tagText, { color: colors.danger }]}>{a}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {selectedChild.emergencyContact ? (
                <Text style={[styles.emergencyLine, { color: colors.textSecondary }]}>
                  Emergency: {selectedChild.emergencyContact}
                </Text>
              ) : null}
            </View>
          </View>
        </>
      ) : null}

      {school ? (
        <>
          <Text style={styles.sectionLabel}>Daycare</Text>
          <View style={[styles.groupCard, cardShadow]}>
            <View style={styles.cardBody}>
              <Text style={styles.rowTitle}>{school.name}</Text>
              {school.contactPhone ? <Text style={styles.rowSubtitle}>{school.contactPhone}</Text> : null}
              {school.contactEmail ? (
                <Text style={[styles.rowSubtitle, { marginTop: school.contactPhone ? 4 : 0 }]}>{school.contactEmail}</Text>
              ) : null}
            </View>
          </View>
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
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tagText: {
      fontFamily: font.medium,
      fontSize: 12,
    },
    emergencyLine: {
      fontFamily: font.regular,
      fontSize: 14,
      marginTop: 12,
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
