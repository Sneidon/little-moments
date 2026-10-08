import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { formatSettingsVersionFooter } from '../../utils';
import { getMobileEligibleRoles } from '../../utils/roles';
import { SettingsDivider, SettingsRow, SettingsSection } from './SettingsSection';

function confirmSignOut() {
  Alert.alert('Sign out?', 'You will need to sign in again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => void signOut(auth) },
  ]);
}

export function AccountSection() {
  const { profile, setSessionPortalRole } = useAuth();
  const { brand, category } = useTheme();
  const canSwitchPortal = getMobileEligibleRoles(profile).length > 1;
  return (
    <>
      <SettingsSection title="Account">
        {canSwitchPortal ? (
          <>
            <SettingsRow icon="swap-horizontal-outline" tile={category.media} title="Switch portal" onPress={() => setSessionPortalRole(null)} />
            <SettingsDivider />
          </>
        ) : null}
        <SettingsRow icon="log-out-outline" tile={category.photo} title="Sign out" onPress={confirmSignOut} />
      </SettingsSection>
      <Text style={[styles.version, { color: brand.textTertiary }]}>{formatSettingsVersionFooter()}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  version: { fontFamily: brandFont.body500, fontSize: 12, textAlign: 'center', marginTop: 28, letterSpacing: 0.3 },
});
