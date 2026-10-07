import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import type { BrandPalette } from '../../theme/tokens';

type Props = { value: string; onChange: (text: string) => void; onSend: () => void; sending: boolean };

export function ChatComposer({ value, onChange, onSend, sending }: Props) {
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const disabled = !value.trim() || sending;
  return (
    <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TextInput
        style={styles.input}
        placeholder="Message"
        placeholderTextColor={brand.textTertiary}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={2000}
        editable={!sending}
        accessibilityLabel="Message"
      />
      <TouchableOpacity
        style={[styles.send, disabled && styles.sendDisabled]}
        onPress={onSend}
        disabled={disabled}
        accessibilityLabel="Send message"
        accessibilityRole="button"
      >
        {sending ? <ActivityIndicator size="small" color={brand.onPrimaryButton} /> : <Ionicons name="send" size={20} color={brand.onPrimaryButton} />}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: brand.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: brand.disabledBorder,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: brand.surfaceRaised,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 9,
      fontFamily: brandFont.body400,
      fontSize: 16,
      color: brand.textPrimary,
    },
    send: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.primaryButton, alignItems: 'center', justifyContent: 'center' },
    sendDisabled: { opacity: 0.45 },
  });
}
