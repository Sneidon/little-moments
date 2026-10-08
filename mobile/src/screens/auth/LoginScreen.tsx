import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { HeaderBlock, DisplayTitle } from '../../components/brand/HeaderBlock';
import { PrimaryButton } from '../../components/brand/Buttons';
import { TextField } from '../../components/brand/TextField';
import { radius, spacing, type BrandPalette } from '../../theme/tokens';
import { useFeedback } from '../../context/FeedbackContext';
import { KeyboardAvoider, keyboardScrollProps } from '../../components/KeyboardAvoider';

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
  const { notify } = useFeedback();
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      void notify({ tone: 'warning', title: 'Sign in', message: 'Enter email and password.' });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: unknown) {
      void notify({ tone: 'error', title: "Couldn't sign in", message: mapAuthError(e) });
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return (
    <KeyboardAvoider style={styles.root} scroll>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}
        {...keyboardScrollProps}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <HeaderBlock paddingBottom={72} gap={20}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="My Little Moments"
          />
          <View style={styles.heroText}>
            <DisplayTitle>My Little Moments</DisplayTitle>
            <Text style={styles.subtitle}>Stay connected to every little moment.</Text>
          </View>
        </HeaderBlock>

        <View style={styles.card}>
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!loading}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            secure
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            textContentType="password"
            autoComplete="password"
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />
          <PrimaryButton
            label="Sign in"
            icon="log-in-outline"
            onPress={handleLogin}
            loading={loading}
            style={styles.submit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoider>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: brand.background },
    scrollContent: { flexGrow: 1 },
    logoImage: {
      width: 72,
      height: 72,
      borderRadius: 22,
      overflow: 'hidden',
      transform: [{ rotate: '-4deg' }],
    },
    heroText: { gap: 10 },
    subtitle: { fontFamily: brandFont.body600, fontSize: 16, lineHeight: 22, color: brand.onHeaderMuted },
    card: {
      marginTop: -44,
      marginHorizontal: spacing.screenX,
      padding: spacing.cardPadding,
      gap: 18,
      borderRadius: radius.cardL,
      backgroundColor: brand.surface,
      borderWidth: 3,
      borderColor: brand.background,
      shadowColor: brand.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    submit: { marginTop: 4 },
  });
}
