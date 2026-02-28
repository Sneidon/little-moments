import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthStack } from './src/navigation/AuthStack';
import { MainTabs } from './src/navigation/MainTabs';

const ALLOWED_ROLES = ['teacher', 'parent'] as const;

function RootNavigator() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (user && profile && !ALLOWED_ROLES.includes(profile.role as typeof ALLOWED_ROLES[number])) {
      signOut(auth);
      Alert.alert(
        'Access denied',
        'This app is only available for teachers and parents. Please use the web app for other roles.'
      );
    }
  }, [user, profile]);

  if (loading) return null; // or a splash screen
  if (!user || !profile) return <AuthStack />;
  if (!ALLOWED_ROLES.includes(profile.role as typeof ALLOWED_ROLES[number])) return <AuthStack />;
  return <MainTabs role={profile.role} />;
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
