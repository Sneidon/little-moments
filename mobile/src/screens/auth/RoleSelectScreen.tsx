import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getMobileEligibleRoles, roleDisplayLabel, selectActiveRole } from '../../utils/roles';
import type { UserRole } from '../../../../shared/types';

type Props = {
  onRoleSelected: (role: UserRole) => void;
};

export function RoleSelectScreen({ onRoleSelected }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const eligible = getMobileEligibleRoles(profile);

  const handleChoose = async (role: UserRole) => {
    setError('');
    setChoosing(role);
    try {
      await selectActiveRole(role);
      await refreshProfile();
      onRoleSelected(role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not switch role.');
      setChoosing(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Choose a portal</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          This account has more than one role. Pick where you want to continue.
        </Text>
        <View style={styles.list}>
          {eligible.map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: choosing && choosing !== role ? 0.55 : 1,
                },
              ]}
              disabled={!!choosing}
              onPress={() => void handleChoose(role)}
              activeOpacity={0.85}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{roleDisplayLabel(role)}</Text>
              {choosing === role ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.cardAction, { color: colors.primary }]}>Continue</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {error ? <Text style={[styles.error, { color: '#b91c1c' }]}>{error}</Text> : null}
        <TouchableOpacity onPress={() => void signOut(auth)} style={styles.signOut}>
          <Text style={{ color: colors.textMuted }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  list: { gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardAction: { fontSize: 14, fontWeight: '600' },
  error: { marginTop: 16, fontSize: 14 },
  signOut: { marginTop: 32, alignItems: 'center', padding: 12 },
});
