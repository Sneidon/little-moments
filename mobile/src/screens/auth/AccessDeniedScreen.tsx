import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { HeaderBlock, DisplayTitle } from '../../components/brand/HeaderBlock';
import { PrimaryButton } from '../../components/brand/Buttons';
import { radius, spacing, type as typeTokens, type BrandPalette, type CategoryPalette } from '../../theme/tokens';

export function AccessDeniedScreen() {
  const { brand, category } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <HeaderBlock paddingBottom={72}>
        <DisplayTitle>Access denied</DisplayTitle>
      </HeaderBlock>
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons name="lock-closed-outline" size={28} color={category.onCategory} />
        </View>
        <Text style={styles.message}>
          This app is only available for teachers and parents. Please use the web app for other roles.
        </Text>
        <PrimaryButton
          label={loading ? 'Signing out…' : 'Sign out'}
          icon="log-out-outline"
          onPress={handleSignOut}
          disabled={loading}
          style={styles.button}
        />
      </View>
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: brand.background },
    card: {
      marginTop: -44,
      marginHorizontal: spacing.screenX,
      padding: 24,
      gap: 16,
      alignItems: 'center',
      borderRadius: radius.cardL,
      backgroundColor: brand.surface,
      borderWidth: 3,
      borderColor: brand.background,
    },
    iconTile: {
      width: 64,
      height: 64,
      borderRadius: radius.tile,
      backgroundColor: category.photo,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-6deg' }],
    },
    message: { ...typeTokens.body, fontSize: 16, lineHeight: 24, color: brand.textSecondary, textAlign: 'center' },
    button: { alignSelf: 'stretch', marginTop: 4 },
  });
}
