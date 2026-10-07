import React from 'react';
import { Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SettingsDivider, SettingsRow } from './SettingsSection';

export function FaqRow() {
  const { category } = useTheme();
  return <SettingsRow icon="help-circle-outline" tile={category.checkOut} title="FAQ" chevron onPress={() => Alert.alert('FAQ', 'Not implemented yet.')} />;
}

export function ContactSupportRow() {
  const { category } = useTheme();
  return (
    <SettingsRow
      icon="headset-outline"
      tile={category.nappy}
      title="Contact support"
      chevron
      onPress={() => Alert.alert('Contact support', 'Not implemented yet.')}
    />
  );
}

export { SettingsDivider };
