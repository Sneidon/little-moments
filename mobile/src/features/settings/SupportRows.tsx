import React from 'react';
import { Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SettingsDivider, SettingsRow } from './SettingsSection';

const SUPPORT_URL = 'https://mylittlemoments.co.za';
const FAQ_URL = 'https://mylittlemoments.co.za/faq';

export function FaqRow() {
  const { category } = useTheme();
  return <SettingsRow icon="help-circle-outline" tile={category.checkOut} title="FAQ" chevron onPress={() => void Linking.openURL(FAQ_URL)} />;
}

export function ContactSupportRow() {
  const { category } = useTheme();
  return (
    <SettingsRow
      icon="headset-outline"
      tile={category.nappy}
      title="Contact support"
      chevron
      onPress={() => void Linking.openURL(SUPPORT_URL)}
    />
  );
}

export { SettingsDivider };
