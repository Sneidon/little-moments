import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthStack } from './src/navigation/AuthStack';
import type { RootStackParamList } from './src/navigation/MainTabs';
import { MainTabs } from './src/navigation/MainTabs';
import { AccessDeniedScreen } from './src/screens/auth/AccessDeniedScreen';
import { RoleSelectScreen } from './src/screens/auth/RoleSelectScreen';
import { getMobileEligibleRoles, selectActiveRole } from './src/utils/roles';
import {
  configureNotifications,
  registerBackgroundMessageHandler,
  subscribeForegroundNotificationBanner,
  type NotificationData,
} from './src/services/notifications';
import { navigateFromNotificationData } from './src/hooks/useNotificationNavigation';

// Register FCM background handler as early as possible (required by react-native-firebase).
registerBackgroundMessageHandler();
configureNotifications();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function RootNavigator() {
  const { user, profile, loading, refreshProfile, sessionPortalRole, setSessionPortalRole } = useAuth();
  const [resolving, setResolving] = useState(false);

  const eligible = getMobileEligibleRoles(profile);

  useEffect(() => {
    if (loading || !user || !profile) {
      setSessionPortalRole(null);
      return;
    }
    if (eligible.length === 0) {
      setSessionPortalRole(null);
      return;
    }
    if (eligible.length > 1) {
      if (sessionPortalRole && eligible.includes(sessionPortalRole)) return;
      return;
    }
    const only = eligible[0];
    if (sessionPortalRole === only) return;
    let cancelled = false;
    setResolving(true);
    void (async () => {
      try {
        if (profile.role !== only) {
          await selectActiveRole(only);
          await refreshProfile();
        }
        if (!cancelled) setSessionPortalRole(only);
      } catch {
        if (!cancelled) setSessionPortalRole(only);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, profile, eligible.join('|'), refreshProfile, sessionPortalRole, setSessionPortalRole]);

  if (loading || (user && !profile) || resolving) return <Loader />;
  if (!user) return <AuthStack />;
  if (eligible.length === 0) return <AccessDeniedScreen />;
  if (eligible.length > 1 && !sessionPortalRole) {
    return (
      <RoleSelectScreen
        onRoleSelected={(role) => {
          setSessionPortalRole(role);
        }}
      />
    );
  }
  const role = sessionPortalRole ?? eligible[0];
  return <MainTabs role={role} />;
}

function AppContent() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<{ title: string; body?: string; data?: NotificationData } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeForegroundNotificationBanner((payload) => {
      setBanner({ title: payload.title, body: payload.body, data: payload.data });
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setBanner(null), 30000);
    });
    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const onBannerPress = () => {
    if (!banner?.data || !navigationRef.isReady()) return;
    const isParent = profile?.role === 'parent';
    navigateFromNotificationData(
      navigationRef as unknown as import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>,
      banner.data,
      isParent
    );
    setBanner(null);
  };

  return (
    <NavigationContainer
      ref={navigationRef}
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
      {banner ? (
        <View
          style={[
            styles.banner,
            {
              top: Math.max(insets.top, 10),
              backgroundColor: isDark ? '#1f2937' : '#111827',
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onBannerPress}
            style={styles.bannerMainTap}
            accessibilityRole="button"
            accessibilityLabel="Open notification details"
          >
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {banner.title}
            </Text>
            {banner.body ? (
              <Text style={styles.bannerBody} numberOfLines={2}>
                {banner.body}
              </Text>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bannerDismissBtn}
            onPress={() => setBanner(null)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification banner"
          >
            <Text style={styles.bannerDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerMainTap: {
    flex: 1,
    minWidth: 0,
  },
  bannerDismissBtn: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bannerDismissText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  bannerBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppBoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppBoot() {
  const { isDark } = useTheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const shellBg = isDark ? '#000000' : '#FFFFFF';
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: shellBg }}>
        <ActivityIndicator size="large" color={isDark ? '#A78BFA' : '#7B61FF'} />
      </View>
    );
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
