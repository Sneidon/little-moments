import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FeedbackProvider } from './src/context/FeedbackContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ForegroundNotificationBanner } from './src/components/ForegroundNotificationBanner';
import { navigateFromNotificationData } from './src/hooks/useNotificationNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/types';
import { configureNotifications, registerBackgroundMessageHandler, type NotificationData } from './src/services/notifications';
import { useAppFonts } from './src/theme/useAppFonts';

// react-native-firebase requires the background handler before any component mounts.
registerBackgroundMessageHandler();
configureNotifications();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function AppContent() {
  const { isDark, brand, colors } = useTheme();
  const { profile } = useAuth();

  const openNotification = (data: NotificationData) => {
    if (!navigationRef.isReady()) return false;
    navigateFromNotificationData(navigationRef as unknown as NativeStackNavigationProp<RootStackParamList>, data, profile?.role === 'parent');
    return true;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...(isDark ? DarkTheme : DefaultTheme),
        dark: isDark,
        colors: {
          primary: brand.primaryButton,
          background: brand.background,
          card: brand.surface,
          text: brand.textPrimary,
          border: brand.disabledBorder,
          notification: colors.danger,
        },
      }}
    >
      <RootNavigator />
      <ForegroundNotificationBanner onOpen={openNotification} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

function AppBoot() {
  const { isDark } = useTheme();
  if (!useAppFonts()) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color={isDark ? '#A78BFA' : '#7B61FF'} />
      </View>
    );
  }
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </FeedbackProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppBoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
