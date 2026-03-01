import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthStack } from './src/navigation/AuthStack';
import { MainTabs } from './src/navigation/MainTabs';
import { AccessDeniedScreen } from './src/screens/auth/AccessDeniedScreen';

const ALLOWED_ROLES = ['teacher', 'parent'] as const;

function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading || (user && !profile)) return <Loader />;
  if (!user) return <AuthStack />;
  if (!ALLOWED_ROLES.includes(profile!.role as (typeof ALLOWED_ROLES)[number])) {
    return <AccessDeniedScreen />;
  }
  return <MainTabs role={profile!.role} />;
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: isDark ? '#a5b4fc' : '#6366f1',
          background: isDark ? '#0f172a' : '#f8fafc',
          card: isDark ? '#1e293b' : '#fff',
          text: isDark ? '#f1f5f9' : '#1e293b',
          border: isDark ? '#334155' : '#e2e8f0',
          notification: isDark ? '#a5b4fc' : '#6366f1',
        },
      }}
    >
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
