import React from 'react';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';
import { formatTabBadgeCount } from '../utils/chatUnread';
import { MessagesListScreen } from '../screens/shared/MessagesListScreen';
import { TAB_ICONS } from './tabIcons';
import { useTabScreenOptions } from './useTabScreenOptions';
import { ParentHomeScreen } from '../screens/parent/ParentHomeScreen';
import { ParentPhotosScreen } from '../screens/parent/ParentPhotosScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentSettingsScreen } from '../screens/parent/ParentSettingsScreen';

const Tab = createNativeBottomTabNavigator();

export function ParentTabs() {
  const unreadMessageCount = useUnreadMessageCount();
  const screenOptions = useTabScreenOptions();
  // Headers are drawn in-screen; screens pad for the tab bar themselves (useTabBarClearance).
  const inScreenHeader = { headerShown: false, overrideScrollViewContentInsetAdjustmentBehavior: false } as const;
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          ...inScreenHeader,
          tabBarIcon: TAB_ICONS.home,
        }}
      />
      <Tab.Screen
        name="Media"
        component={ParentPhotosScreen}
        options={{
          title: 'Media',
          ...inScreenHeader,
          tabBarIcon: TAB_ICONS.media,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={ParentCalendarScreen}
        options={{
          title: 'Calendar',
          ...inScreenHeader,
          tabBarIcon: TAB_ICONS.calendar,
        }}
      />
      <Tab.Screen
        name="MessagesList"
        component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
        options={{
          title: 'Messages',
          headerShown: false,
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          tabBarIcon: TAB_ICONS.messages,
          tabBarBadge: formatTabBadgeCount(unreadMessageCount),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ParentSettingsScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          ...inScreenHeader,
          tabBarIcon: TAB_ICONS.profile,
        }}
      />
    </Tab.Navigator>
  );
}
