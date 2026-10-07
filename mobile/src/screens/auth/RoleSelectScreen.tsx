import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getMobileEligibleRoles, roleDisplayLabel, selectActiveRole } from '../../utils/roles';
import { brandFont } from '../../theme/typography';
import { HeaderBlock, Overline, DisplayTitle } from '../../components/brand/HeaderBlock';
import { OutlineButton } from '../../components/brand/Buttons';
import { radius, spacing, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../theme/tokens';
import type { UserRole } from '@shared/types';

type Props = {
  onRoleSelected: (role: UserRole) => void;
};

export function RoleSelectScreen({ onRoleSelected }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { brand, category } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 12 }}>
        <HeaderBlock paddingBottom={30} gap={12}>
          <Overline>Welcome back</Overline>
          <DisplayTitle>Choose a portal</DisplayTitle>
          <Text style={styles.subtitle}>
            This account has more than one role. Pick where you want to continue.
          </Text>
        </HeaderBlock>

        <View style={styles.body}>
          {eligible.map((role) => {
            const isTeacher = role === 'teacher';
            return (
              <TouchableOpacity
                key={role}
                style={[styles.card, { opacity: choosing && choosing !== role ? 0.55 : 1 }]}
                disabled={!!choosing}
                onPress={() => void handleChoose(role)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Continue as ${roleDisplayLabel(role)}`}
                accessibilityState={{ busy: choosing === role, disabled: !!choosing }}
              >
                <View
                  style={[styles.roleIcon, { backgroundColor: isTeacher ? category.attendance : category.nap }]}
                >
                  <Ionicons
                    name={isTeacher ? 'school-outline' : 'people-outline'}
                    size={26}
                    color={category.onCategory}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{roleDisplayLabel(role)}</Text>
                  <Text style={styles.cardAction}>Continue</Text>
                </View>
                {choosing === role ? (
                  <ActivityIndicator color={brand.textPrimary} />
                ) : (
                  <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={20} color={brand.onInverse} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="warning-outline" size={18} color={category.onCategory} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <OutlineButton
            label="Sign out"
            icon="log-out-outline"
            onPress={() => void signOut(auth)}
            style={styles.signOut}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: brand.background },
    subtitle: { fontFamily: brandFont.body600, fontSize: 16, lineHeight: 22, color: brand.onHeaderMuted },
    body: { padding: spacing.screenX, gap: spacing.gapM },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: radius.card,
      backgroundColor: brand.surface,
    },
    roleIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.tile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, minWidth: 0, gap: 2 },
    cardTitle: { ...typeTokens.cardTitle, color: brand.textPrimary },
    cardAction: { fontFamily: brandFont.body600, fontSize: 14, color: brand.textSecondary },
    chevron: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: brand.inverseFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radius.chip,
      backgroundColor: category.photo,
    },
    errorText: { flex: 1, fontFamily: brandFont.body700, fontSize: 14, color: category.onCategory },
    signOut: { marginTop: 10 },
  });
}
