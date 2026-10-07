import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { themeSubtitle } from '../../components/SettingsSection';
import { HeaderBlock, Overline } from '../../components/brand/HeaderBlock';
import {
  NATIVE_TAB_BAR_CLEARANCE_IOS,
  radius,
  spacing,
  type as typeTokens,
  type BrandPalette,
  type CategoryPalette,
} from '../../theme/tokens';
import type { ThemeMode } from '../../context/ThemeContext';
import { getInitials, formatSettingsVersionFooter } from '../../utils';
import { getMobileEligibleRoles } from '../../utils/roles';
import type { ClassRoom } from '@shared/types';
import type { School } from '@shared/types';

export function TeacherSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile, setSessionPortalRole } = useAuth();
  const { brand, category, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const canSwitchPortal = getMobileEligibleRoles(profile).length > 1;

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

  const tabBarClearance = Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24;

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { mode: 'light', label: 'Light', icon: 'sunny-outline' },
    { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
    { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  const row = (opts: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tile: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    chevron?: boolean;
    danger?: boolean;
  }) => {
    const content = (
      <>
        <View style={[styles.iconTile, { backgroundColor: opts.tile }]}>
          <Ionicons name={opts.icon} size={20} color={category.onCategory} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {opts.title}
          </Text>
          {opts.subtitle ? <Text style={styles.rowSubtitle}>{opts.subtitle}</Text> : null}
        </View>
        {opts.chevron ? <Ionicons name="chevron-forward" size={20} color={brand.textTertiary} /> : null}
      </>
    );
    return opts.onPress ? (
      <TouchableOpacity
        style={styles.row}
        onPress={opts.onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={opts.title}
      >
        {content}
      </TouchableOpacity>
    ) : (
      <View style={styles.row}>{content}</View>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: tabBarClearance }}
      showsVerticalScrollIndicator={false}
    >
      <HeaderBlock paddingBottom={30} gap={18}>
        <Overline>Profile</Overline>
        <TouchableOpacity
          style={styles.profileRow}
          onPress={onProfilePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, ${email}. Profile information`}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
            {className ? (
              <View style={styles.classChip}>
                <Ionicons name="school-outline" size={14} color={category.onCategory} />
                <Text style={styles.classChipText} numberOfLines={1}>
                  {className}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </HeaderBlock>

      <View style={styles.body}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Appearance
        </Text>
        <View style={styles.card}>
          <View style={styles.themeHead}>
            <View style={[styles.iconTile, { backgroundColor: category.nap }]}>
              <Ionicons name="contrast-outline" size={20} color={category.onCategory} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Theme</Text>
              <Text style={styles.rowSubtitle}>{themeSubtitle(themeMode)}</Text>
            </View>
          </View>
          <View style={styles.themeRow} accessibilityRole="radiogroup">
            {themeOptions.map((opt) => {
              const active = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setThemeMode(opt.mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <Ionicons name={opt.icon} size={18} color={active ? brand.onInverse : brand.textSecondary} />
                  <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Notifications
        </Text>
        <View style={styles.card}>
          {row({
            icon: 'notifications-outline',
            tile: category.activity,
            title: 'Notification settings',
            chevron: true,
            onPress: () => navigation.navigate('TeacherNotificationSettings'),
          })}
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Support
        </Text>
        <View style={styles.card}>
          {row({
            icon: 'help-circle-outline',
            tile: category.checkOut,
            title: 'FAQ',
            chevron: true,
            onPress: () => Alert.alert('FAQ', 'Not implemented yet.'),
          })}
          <View style={styles.divider} />
          {row({
            icon: 'headset-outline',
            tile: category.nappy,
            title: 'Contact support',
            chevron: true,
            onPress: () => Alert.alert('Contact support', 'Not implemented yet.'),
          })}
        </View>

        {profile?.schoolId ? (
          <>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              School
            </Text>
            <View style={styles.card}>
              {schoolLoading ? (
                <Text style={styles.cardNote}>Loading…</Text>
              ) : school ? (
                row({ icon: 'business-outline', tile: category.attendance, title: school.name })
              ) : (
                <Text style={styles.cardNote}>Couldn&apos;t load school.</Text>
              )}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Account
        </Text>
        <View style={styles.card}>
          {canSwitchPortal ? (
            <>
              {row({
                icon: 'swap-horizontal-outline',
                tile: category.media,
                title: 'Switch portal',
                onPress: () => setSessionPortalRole(null),
              })}
              <View style={styles.divider} />
            </>
          ) : null}
          {row({
            icon: 'log-out-outline',
            tile: category.photo,
            title: 'Sign out',
            onPress: handleSignOut,
          })}
        </View>

        <Text style={styles.versionText}>{formatSettingsVersionFooter()}</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 30,
      backgroundColor: category.activity,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-4deg' }],
    },
    avatarInitials: { fontFamily: brandFont.display800, fontSize: 34, letterSpacing: -1, color: category.onCategory },
    profileText: { flex: 1, minWidth: 0, gap: 4 },
    profileName: { fontFamily: brandFont.display800, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: brand.onHeader },
    profileEmail: { fontFamily: brandFont.body500, fontSize: 14, color: brand.onHeaderMuted },
    classChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: category.activity,
      maxWidth: '100%',
    },
    classChipText: { fontFamily: brandFont.body800, fontSize: 13, color: category.onCategory, flexShrink: 1 },
    body: { paddingHorizontal: spacing.screenX, paddingTop: 6 },
    sectionTitle: { ...typeTokens.section, color: brand.textPrimary, marginTop: 24, marginBottom: 12, marginHorizontal: 4 },
    card: { backgroundColor: brand.surface, borderRadius: radius.card, paddingVertical: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
    iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    rowSubtitle: { fontFamily: brandFont.body500, fontSize: 14, color: brand.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.disabledBorder, marginLeft: 74 },
    cardNote: { ...typeTokens.body, color: brand.textSecondary, paddingHorizontal: 16, paddingVertical: 14 },
    themeHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 10 },
    themeRow: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 14 },
    themeOption: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    themeOptionActive: { backgroundColor: brand.inverseFill },
    themeOptionText: { fontFamily: brandFont.body700, fontSize: 14, color: brand.textSecondary },
    themeOptionTextActive: { fontFamily: brandFont.body800, color: brand.onInverse },
    versionText: {
      fontFamily: brandFont.body500,
      fontSize: 12,
      color: brand.textTertiary,
      textAlign: 'center',
      marginTop: 28,
      letterSpacing: 0.3,
    },
  });
}
