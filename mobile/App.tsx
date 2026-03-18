import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthStack } from './src/navigation/AuthStack';
import { MainTabs } from './src/navigation/MainTabs';
import { AccessDeniedScreen } from './src/screens/auth/AccessDeniedScreen';
import { configureNotifications, registerBackgroundMessageHandler } from './src/services/notifications';

// Register FCM background handler as early as possible (required by react-native-firebase).
registerBackgroundMessageHandler();
configureNotifications();

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
          primary: isDark ? '#3B82F6' : '#7B61FF',
          background: isDark ? '#0B0B0B' : '#F0F2F5',
          card: isDark ? '#1A1A1A' : '#fff',
          text: isDark ? '#F7FAFC' : '#1A202C',
          border: isDark ? '#2D2D2D' : '#EDF2F7',
          notification: isDark ? '#3B82F6' : '#7B61FF',
        },
      }}
    >
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#7B61FF" />
      </View>
    );
  }
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
