import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
function mapAuthError(e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('user-not-found')) {
    return 'No account found for this email.';
  }
  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (code.includes('network')) {
    return 'Check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert('Sign in', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: unknown) {
      Alert.alert("Couldn't sign in", mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const bottomPad = Math.max(insets.bottom, 20);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: bottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={[styles.logoMark, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="heart" size={36} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>My Little Moments</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Stay connected to every little moment.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: emailFocused ? colors.primary : colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputPassword,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: passwordFocused ? colors.primary : colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                editable={!loading}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryContrast} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={colors.primaryContrast} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryContrast }]}>Sign in</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      marginBottom: 22,
    },
    logoMark: {
      width: 88,
      height: 88,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    brandTitle: {
      fontSize: 26,
      letterSpacing: -0.5,
      ...f('bold'),
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      ...f('medium'),
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 12,
    },
    card: {
      borderRadius: 20,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      padding: 22,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 3 } : {}),
    },
    field: {
      marginBottom: 18,
    },
    label: {
      fontSize: 13,
      ...f('semiBold'),
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 16,
      ...f('regular'),
    },
    passwordWrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    inputPassword: {
      paddingRight: 52,
    },
    eyeBtn: {
      position: 'absolute',
      right: 14,
      height: 44,
      justifyContent: 'center',
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 6,
    },
    primaryBtnDisabled: {
      opacity: 0.75,
    },
    primaryBtnText: {
      fontSize: 16,
      ...f('semiBold'),
    },
  });
}
