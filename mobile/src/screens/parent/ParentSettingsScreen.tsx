import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
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
import { getMobileEligibleRoles } from '../../utils/roles';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { School } from '../../../../shared/types';

export function ParentSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { profile, selectedChildId, setSelectedChildId, setSessionPortalRole } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const cardShadow = useMemo(() => settingsCardShadow(isDark), [isDark]);
  const canSwitchPortal = getMobileEligibleRoles(profile).length > 1;

  const [children, setChildren] = useState<Child[]>([]);
  const [schoolsById, setSchoolsById] = useState<Record<string, School>>({});
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
          where('parentIds', 'array-contains', uid),
          where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
      }
      setChildren(list);
      const uniqueSchoolIds = [...new Set(list.map((c) => c.schoolId).filter(Boolean))];
      const schools: Record<string, School> = {};
      await Promise.all(
        uniqueSchoolIds.map(async (sid) => {
          const schoolSnap = await getDoc(doc(db, 'schools', sid));
          if (schoolSnap.exists()) {
            schools[sid] = { id: schoolSnap.id, ...schoolSnap.data() } as School;
          }
        })
      );
      setSchoolsById(schools);
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
          const data = d.data() as ClassRoom;
          const raw = typeof data.name === 'string' ? data.name.trim() : '';
          const label = raw || d.id;
          // Composite key so multiple schools never collide; matches child.schoolId + child.classId (class doc id).
          names[`${sid}:${d.id}`] = label;
        });
      }
      setClassNames(names);
    })();
  }, [children]);

  useEffect(() => {
    if (children.length === 0) return;
    if (selectedChildId && !children.some((c) => c.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const selectedChild = selectedChildId
    ? children.find((c) => c.id === selectedChildId)
    : children[0];
  const className = selectedChild?.classId
    ? classNames[`${selectedChild.schoolId}:${selectedChild.classId}`] ?? selectedChild.classId
    : null;
  const daycareSchool = selectedChild?.schoolId ? schoolsById[selectedChild.schoolId] ?? null : null;

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
            Alert.alert('FAQ', 'Not implemented yet.')
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
            Alert.alert('Contact support', 'Not implemented yet.')
          }
          activeOpacity={0.75}
        >
          <SettingsIconBox name="headset-outline" backgroundColor={colors.primaryMuted} iconColor={colors.primary} />
          <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Contact support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {children.length > 0 && selectedChild ? (
        <>
          <Text style={styles.sectionLabel}>Family</Text>
          <View style={[styles.miniCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <View style={styles.miniHeaderRow}>
              <View style={[styles.miniAvatar, { backgroundColor: colors.primaryMuted }]}>
                {selectedChild.photoURL ? (
                  <Image source={{ uri: selectedChild.photoURL }} style={styles.miniAvatarImg} />
                ) : (
                  <Text style={[styles.miniAvatarText, { color: colors.primary }]}>{getInitials(selectedChild.name)}</Text>
                )}
              </View>
              <View style={styles.miniHeaderTextWrap}>
                <Text style={[styles.miniName, { color: colors.text }]} numberOfLines={1}>
                  {selectedChild.name}
                </Text>
                <Text style={[styles.miniMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {getAge(selectedChild.dateOfBirth)} old
                  {className ? ` · ${className}` : ''}
                </Text>
              </View>
            </View>

            {selectedChild.allergies?.length ? (
              <View style={[styles.miniChip, { backgroundColor: colors.dangerMuted }]}>
                <Ionicons name="warning-outline" size={14} color={colors.danger} />
                <Text style={[styles.miniChipText, { color: colors.danger }]} numberOfLines={1}>
                  {selectedChild.allergies.join(', ')}
                </Text>
              </View>
            ) : null}

            {selectedChild.emergencyContact ? (
              <>
                <View style={[styles.miniDivider, { backgroundColor: colors.cardBorder }]} />
                <View style={styles.miniLine}>
                  <Text style={[styles.miniLineLabel, { color: colors.textMuted }]}>Emergency</Text>
                  <Text style={[styles.miniLineValue, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedChild.emergencyContact}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      {daycareSchool ? (
        <>
          <Text style={styles.sectionLabel}>Daycare</Text>
          <View style={[styles.miniCard, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <View style={styles.miniHeaderRow}>
              <View style={[styles.miniAvatar, { backgroundColor: colors.accentTealSoft }]}>
                <Ionicons name="business-outline" size={18} color={colors.accentTeal} />
              </View>
              <View style={styles.miniHeaderTextWrap}>
                <Text style={[styles.miniName, { color: colors.text }]} numberOfLines={1}>
                  {daycareSchool.name}
                </Text>
                <Text style={[styles.miniMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {daycareSchool.contactPhone || daycareSchool.contactEmail || 'No contact info'}
                </Text>
              </View>
            </View>

            {daycareSchool.address ? (
              <>
                <View style={[styles.miniDivider, { backgroundColor: colors.cardBorder }]} />
                <View style={styles.miniLine}>
                  <Text style={[styles.miniLineLabel, { color: colors.textMuted }]}>Address</Text>
                  <Text style={[styles.miniLineValue, { color: colors.textSecondary }]} numberOfLines={2}>
                    {daycareSchool.address}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </>
      ) : selectedChild && !schoolsById[selectedChild.schoolId] ? (
        <>
          <Text style={styles.sectionLabel}>Daycare</Text>
          <View style={[styles.groupCard, cardShadow]}>
            <View style={styles.cardBody}>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>School details couldn&apos;t be loaded.</Text>
            </View>
          </View>
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={[styles.groupCard, cardShadow]}>
        {canSwitchPortal ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setSessionPortalRole(null)}
            activeOpacity={0.75}
          >
            <SettingsIconBox name="swap-horizontal-outline" backgroundColor={colors.accentTealSoft} iconColor={colors.accentTeal} />
            <Text style={[styles.rowTitle, styles.rowTitleFlex]}>Switch portal</Text>
          </TouchableOpacity>
        ) : null}
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
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    miniCard: {
      borderRadius: 16,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      padding: 14,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
    miniHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    miniAvatar: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    miniAvatarImg: { width: 42, height: 42, borderRadius: 12 },
    miniAvatarText: { fontFamily: font.bold, fontSize: 14 },
    miniHeaderTextWrap: { flex: 1, minWidth: 0, marginLeft: 12 },
    miniName: { fontFamily: font.semiBold, fontSize: 16 },
    miniMeta: { fontFamily: font.regular, fontSize: 13, marginTop: 2 },
    miniChip: {
      marginTop: 12,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      maxWidth: '100%',
    },
    miniChipText: { fontFamily: font.semiBold, fontSize: 12, flexShrink: 1 },
    miniDivider: { height: StyleSheet.hairlineWidth, marginTop: 12, marginBottom: 10 },
    miniLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    miniLineLabel: { fontFamily: font.medium, fontSize: 12, minWidth: 68 },
    miniLineValue: { fontFamily: font.regular, fontSize: 13, flex: 1 },
    sectionHint: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
      marginTop: -2,
    },
    childChipScrollOuter: { marginBottom: 12, marginHorizontal: -4 },
    childChipScroll: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
    childChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    childChipText: { fontFamily: font.semiBold, fontSize: 14, maxWidth: 140 },
    familyCard: {
      borderRadius: 18,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      overflow: 'hidden',
      paddingBottom: 4,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
    familyCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    familyAvatar: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    familyAvatarImg: { width: 56, height: 56, borderRadius: 16 },
    familyAvatarInitials: { fontFamily: font.bold, fontSize: 20 },
    familyHeaderText: { flex: 1, marginLeft: 14, minWidth: 0 },
    familyName: { fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
    familyNickname: { fontFamily: font.regular, fontSize: 14, marginTop: 4 },
    familyDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
    familyInfoBlock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    allergyBlock: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 14 },
    allergyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    allergyTitle: { fontFamily: font.semiBold, fontSize: 14 },
    allergyTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    emergencyCard: {
      marginHorizontal: 12,
      marginBottom: 14,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    emergencyTitle: { fontFamily: font.semiBold, fontSize: 14 },
    emergencyName: { fontFamily: font.medium, fontSize: 15, marginBottom: 6 },
    emergencyTapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    emergencyPhone: { fontFamily: font.semiBold, fontSize: 15, flex: 1 },
    emergencyPlain: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
    daycareCard: {
      borderRadius: 18,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      overflow: 'hidden',
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 2 } : {}),
    },
    daycareBrandBar: { height: 4, width: '100%' },
    daycareCardInner: { padding: 16 },
    daycareTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
    daycareIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daycareTitleText: { flex: 1, marginLeft: 14, minWidth: 0 },
    daycareName: { fontFamily: font.bold, fontSize: 19, lineHeight: 24 },
    daycareDesc: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
    daycareInfoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 },
    daycareInfoIcon: { marginRight: 10, marginTop: 2 },
    daycareInfoValue: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
    daycareDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
    daycareActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 4,
    },
    daycareActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    daycareActionBody: { flex: 1, minWidth: 0 },
    daycareActionLabel: { fontFamily: font.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
    daycareActionValue: { fontFamily: font.semiBold, fontSize: 15, marginTop: 2 },
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
