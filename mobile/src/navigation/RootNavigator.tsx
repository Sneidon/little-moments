import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AccessDeniedScreen } from '../screens/auth/AccessDeniedScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { getMobileEligibleRoles, selectActiveRole } from '../utils/roles';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function RootNavigator() {
  const { user, profile, loading, refreshProfile, sessionPortalRole, setSessionPortalRole } = useAuth();
  const [resolving, setResolving] = useState(false);
  const eligible = getMobileEligibleRoles(profile);

  useEffect(() => {
    if (loading || !user || !profile || eligible.length === 0) {
      setSessionPortalRole(null);
      return;
    }
    if (eligible.length > 1) return;
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
      } catch {
        // Fall through: open the only eligible portal even if switching the active role failed.
      } finally {
        if (!cancelled) {
          setSessionPortalRole(only);
          setResolving(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, profile, eligible.join('|'), refreshProfile, sessionPortalRole, setSessionPortalRole]);

  if (loading || (user && !profile) || resolving) return <Loader />;
  if (!user) return <AuthStack />;
  if (eligible.length === 0) return <AccessDeniedScreen />;
  if (eligible.length > 1 && !sessionPortalRole) return <RoleSelectScreen onRoleSelected={setSessionPortalRole} />;
  return <MainTabs role={sessionPortalRole ?? eligible[0]} />;
}
