import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTeacherClassChildren } from '../../hooks';
import { AccountSection } from '../../features/settings/AccountSection';
import { ProfileHeader } from '../../features/settings/ProfileHeader';
import { SettingsNote, SettingsRow, SettingsSection } from '../../features/settings/SettingsSection';
import { ContactSupportRow, FaqRow, SettingsDivider } from '../../features/settings/SupportRows';
import { ThemeSelector } from '../../features/settings/ThemeSelector';
import { NATIVE_TAB_BAR_CLEARANCE_IOS, spacing } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

export function TeacherSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { brand, category } = useTheme();
  const { className, schoolName, loading } = useTeacherClassChildren();
  const name = profile?.displayName?.trim() || 'Teacher';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: brand.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24 }}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        overline="Profile"
        name={name}
        email={profile?.email ?? '-'}
        photoURL={profile?.photoURL}
        chip={className}
        onPress={() =>
          Alert.alert(
            'Profile',
            'To update your name or photo, contact your school administrator. You can also use the web app if your account has access.'
          )
        }
      />
      <View style={styles.body}>
        <ThemeSelector />
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="notifications-outline"
            tile={category.activity}
            title="Notification settings"
            chevron
            onPress={() => navigation.navigate('TeacherNotificationSettings')}
          />
        </SettingsSection>
        <SettingsSection title="Support">
          <FaqRow />
          <SettingsDivider />
          <ContactSupportRow />
        </SettingsSection>
        {profile?.schoolId ? (
          <SettingsSection title="School">
            {schoolName ? (
              <SettingsRow icon="business-outline" tile={category.attendance} title={schoolName} />
            ) : (
              <SettingsNote>{loading ? 'Loading…' : "Couldn't load school."}</SettingsNote>
            )}
          </SettingsSection>
        ) : null}
        <AccountSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.screenX, paddingTop: 6 },
});
