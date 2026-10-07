import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { brandFont } from '../../theme/typography';
import { HeaderBlock, DisplayTitle } from '../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../components/brand/RoundIconButton';
import { PrimaryButton } from '../../components/brand/Buttons';
import { TextField } from '../../components/brand/TextField';
import { radius, spacing, type BrandPalette } from '../../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import type { UserRole } from '../../../../shared/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const ROLES: UserRole[] = ['parent', 'teacher'];

export function RegisterScreen({ navigation }: Props) {
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('parent');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(u, { displayName: displayName.trim() });
      const now = new Date().toISOString();
      await setDoc(doc(db, 'users', u.uid), {
        email: u.email,
        displayName: displayName.trim(),
        role,
        roles: [role],
        createdAt: now,
        updatedAt: now,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 20) + 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeaderBlock paddingBottom={28} gap={20}>
          <View>
            <RoundIconButton
              icon="chevron-back"
              variant="onHeader"
              accessibilityLabel="Back to sign in"
              onPress={() => navigation.goBack()}
              disabled={loading}
            />
          </View>
          <DisplayTitle>Create account</DisplayTitle>
        </HeaderBlock>

        <View style={styles.card}>
          <TextField
            label="Full name"
            placeholder="Full name"
            value={displayName}
            onChangeText={setDisplayName}
            textContentType="name"
            autoComplete="name"
            editable={!loading}
          />
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!loading}
          />
          <TextField
            label="Password"
            secure
            placeholder="Password (min 6)"
            value={password}
            onChangeText={setPassword}
            textContentType="newPassword"
            editable={!loading}
          />

          <View style={styles.roleBlock}>
            <Text style={styles.roleLabel}>I am a</Text>
            <View style={styles.roleRow} accessibilityRole="radiogroup">
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, active && styles.roleBtnActive]}
                    onPress={() => setRole(r)}
                    disabled={loading}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active, disabled: loading }}
                  >
                    <Ionicons
                      name={r === 'teacher' ? 'school-outline' : 'people-outline'}
                      size={18}
                      color={active ? brand.onInverse : brand.textSecondary}
                    />
                    <Text style={[styles.roleText, active && styles.roleTextActive]}>
                      {r === 'teacher' ? 'Teacher' : 'Parent'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <PrimaryButton
            label={loading ? 'Creating account…' : 'Create account'}
            icon="create-outline"
            onPress={handleRegister}
            disabled={loading}
            style={styles.submit}
          />
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.goBack()}
            disabled={loading}
            accessibilityRole="link"
          >
            <Ionicons name="arrow-back" size={18} color={brand.textPrimary} />
            <Text style={styles.link}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: brand.background },
    card: {
      marginTop: spacing.gapL,
      marginHorizontal: spacing.screenX,
      padding: spacing.cardPadding,
      gap: 18,
      borderRadius: radius.cardL,
      backgroundColor: brand.surface,
    },
    roleBlock: { gap: 8 },
    roleLabel: { fontFamily: brandFont.body800, fontSize: 14, color: brand.textPrimary },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleBtn: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.chip,
      backgroundColor: brand.surfaceRaised,
    },
    roleBtnActive: { backgroundColor: brand.inverseFill },
    roleText: { fontFamily: brandFont.body700, fontSize: 15, color: brand.textSecondary },
    roleTextActive: { fontFamily: brandFont.body800, color: brand.onInverse },
    submit: { marginTop: 4 },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
    },
    link: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
  });
}
