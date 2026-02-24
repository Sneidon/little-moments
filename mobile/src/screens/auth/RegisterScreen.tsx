import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import type { UserRole } from '../../../../shared/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const ROLES: UserRole[] = ['parent', 'teacher'];

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <View style={styles.headerRow}>
          <Ionicons name="person-add-outline" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Create account</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={displayName}
          onChangeText={setDisplayName}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
              disabled={loading}
            >
              <Ionicons
                name={r === 'teacher' ? 'school-outline' : 'people-outline'}
                size={18}
                color={role === r ? colors.primary : colors.textMuted}
                style={styles.roleIcon}
              />
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Ionicons name="create-outline" size={20} color={colors.primaryContrast} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create account'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    form: { gap: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 14,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    roleIcon: {},
    roleText: { color: colors.textMuted },
    roleTextActive: { color: colors.primary, fontWeight: '600' },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 8,
    },
    buttonIcon: { marginRight: 8 },
    buttonText: { color: colors.primaryContrast, fontWeight: '600' },
    backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
    link: { color: colors.primary, fontWeight: '500' },
  });
}
