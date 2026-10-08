import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { radius, size as sizeTokens } from '../../theme/tokens';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  secure?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, secure, onFocus, onBlur, ...inputProps },
  ref
) {
  const { brand } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: brand.textPrimary }]}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          secureTextEntry={secure ? !revealed : undefined}
          placeholderTextColor={brand.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            secure && styles.inputSecure,
            {
              backgroundColor: brand.surfaceRaised,
              borderColor: focused ? brand.textPrimary : brand.surfaceRaised,
              color: brand.textPrimary,
            },
          ]}
        />
        {secure ? (
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={brand.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: brandFont.body800, fontSize: 14 },
  inputWrap: { justifyContent: 'center' },
  input: {
    minHeight: 54,
    borderWidth: 2,
    borderRadius: radius.chip,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: brandFont.body500,
  },
  inputSecure: { paddingRight: 56 },
  eyeBtn: {
    position: 'absolute',
    right: 4,
    width: sizeTokens.touchMin + 4,
    height: sizeTokens.touchMin + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
