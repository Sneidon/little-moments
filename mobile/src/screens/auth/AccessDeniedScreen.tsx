import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';

export function AccessDeniedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
        <Text style={styles.title}>Access denied</Text>
        <Text style={styles.message}>
          This app is only available for teachers and parents. Please use the web app for other roles.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.primaryContrast} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>{loading ? 'Signing out…' : 'Sign out'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    content: {
      alignItems: 'center',
      maxWidth: 320,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginTop: 20,
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 24,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 8,
      marginTop: 32,
      minWidth: 160,
    },
    buttonIcon: { marginRight: 8 },
    buttonText: { color: colors.primaryContrast, fontWeight: '600' },
  });
}
