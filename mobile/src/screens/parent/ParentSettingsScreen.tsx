import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarClearance } from '../../hooks';
import { AccountSection } from '../../features/settings/AccountSection';
import { ProfileHeader } from '../../features/settings/ProfileHeader';
import { SettingsRow, SettingsSection } from '../../features/settings/SettingsSection';
import { ContactSupportRow, FaqRow, SettingsDivider } from '../../features/settings/SupportRows';
import { ThemeSelector } from '../../features/settings/ThemeSelector';
import { spacing } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { ChildCard, DaycareCard } from './settings/FamilyCards';
import { useParentFamily } from './settings/useParentFamily';

export function ParentSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabBarClearance = useTabBarClearance();
  const { profile } = useAuth();
  const { brand, category } = useTheme();
  const { selectedChild, school, className } = useParentFamily();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: brand.background }}
      contentContainerStyle={{ paddingBottom: tabBarClearance }}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        overline="Settings"
        name={profile?.displayName?.trim() || 'Parent'}
        email={profile?.email ?? '-'}
        photoURL={profile?.photoURL}
        chip={className}
        onPress={() => navigation.navigate('ParentProfile')}
      />
      <View style={styles.body}>
        <ThemeSelector />
        <SettingsSection title="Support">
          <FaqRow />
          <SettingsDivider />
          <SettingsRow
            icon="notifications-outline"
            tile={category.activity}
            title="Notifications"
            chevron
            onPress={() => navigation.navigate('ParentNotifications')}
          />
          <SettingsDivider />
          <ContactSupportRow />
        </SettingsSection>
        {selectedChild ? <ChildCard child={selectedChild} className={className} /> : null}
        {selectedChild && school !== undefined ? <DaycareCard school={school} /> : null}
        <AccountSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.screenX, paddingTop: 6 },
});
