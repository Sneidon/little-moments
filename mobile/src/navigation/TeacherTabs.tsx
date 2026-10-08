import React from 'react';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';
import { formatTabBadgeCount } from '../utils/chatUnread';
import { MessagesListScreen } from '../screens/shared/MessagesListScreen';
import { TAB_ICONS } from './tabIcons';
import { useTabScreenOptions } from './useTabScreenOptions';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherSettingsScreen } from '../screens/teacher/TeacherSettingsScreen';

const Tab = createNativeBottomTabNavigator();

export function TeacherTabs() {
  const unreadMessageCount = useUnreadMessageCount();
  const screenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={TeacherHomeScreen}
        options={{
          // Edge-to-edge header: the screen pads for the tab bar itself (tabBarClearance).
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          // Header is drawn in-screen (HeaderBlock).
          headerShown: false,
          title: 'Dashboard',
          tabBarIcon: TAB_ICONS.dashboard,
        }}
      />
      <Tab.Screen
        name="Students"
        component={TeacherStudentsScreen}
        options={{
          // Edge-to-edge header: the screen pads for the tab bar itself (tabBarClearance).
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          headerShown: false,
          title: 'Students',
          tabBarIcon: TAB_ICONS.students,
        }}
      />
      <Tab.Screen
        name="MessagesList"
        component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
        options={{
          // Header is drawn in-screen (HeaderBlock); the screen pads for the tab bar itself.
          headerShown: false,
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          title: 'Messages',
          tabBarIcon: TAB_ICONS.messages,
          tabBarBadge: formatTabBadgeCount(unreadMessageCount),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={TeacherSettingsScreen}
        options={{
          // Header is drawn in-screen (HeaderBlock); the screen pads for the tab bar itself.
          headerShown: false,
          overrideScrollViewContentInsetAdjustmentBehavior: false,
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: TAB_ICONS.profile,
        }}
      />
    </Tab.Navigator>
  );
}
