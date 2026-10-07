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
  const tabHeader = { headerShown: true as const };
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          headerShown: true,
          tabBarIcon: TAB_ICONS.home,
        }}
      />
      <Tab.Screen
        name="Media"
        component={ParentPhotosScreen}
        options={{
          title: 'Media',
          ...tabHeader,
          tabBarIcon: TAB_ICONS.media,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={ParentCalendarScreen}
        options={{
          title: 'Calendar',
          ...tabHeader,
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
          title: 'Settings',
          headerShown: false,
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          tabBarIcon: TAB_ICONS.settings,
        }}
      />
    </Tab.Navigator>
  );
}
