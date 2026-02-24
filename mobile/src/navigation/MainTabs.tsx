import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { UserRole } from '../../../shared/types';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherReportsScreen } from '../screens/teacher/TeacherReportsScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherSettingsScreen } from '../screens/teacher/TeacherSettingsScreen';
import { AnnouncementsScreen } from '../screens/shared/AnnouncementsScreen';
import { EventsScreen } from '../screens/shared/EventsScreen';
import { MessagesListScreen } from '../screens/shared/MessagesListScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { SelectChildToMessageScreen } from '../screens/teacher/SelectChildToMessageScreen';
import { ParentHomeScreen } from '../screens/parent/ParentHomeScreen';
import { ParentChildProfileScreen } from '../screens/parent/ParentChildProfileScreen';
import { ParentSettingsScreen } from '../screens/parent/ParentSettingsScreen';
import { PhotosPlaceholderScreen } from '../screens/shared/PhotosPlaceholderScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';

export type RootStackParamList = {
  MainTabs:
    | undefined
    | { screen: 'AddUpdate'; params?: { initialChildId?: string; initialType?: string } };
  Reports: { childId: string };
  Announcements: undefined;
  Events: undefined;
  ChildProfile: { childId: string; schoolId: string };
  ParentAnnouncements: undefined;
  SelectChildToMessage: undefined;
  ChatThread: { chatId: string; schoolId: string };
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function TeacherTabs() {
  const { colors } = useTheme();
  const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name'], focused: boolean) => (
    <Ionicons name={name} size={24} color={focused ? colors.tabActive : colors.tabInactive} />
  );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TeacherHomeScreen}
        options={{
          title: 'Dashboard',
          headerShown: true,
          headerTitle: 'Dashboard',
          tabBarIcon: ({ focused }) => tabIcon('grid-outline', focused),
        }}
      />
      <Tab.Screen
        name="AddUpdate"
        component={AddUpdateScreen}
        options={{
          title: 'Add Update',
          headerShown: true,
          headerTitle: 'Add update',
          tabBarIcon: ({ focused }) => tabIcon('add-circle-outline', focused),
        }}
      />
        <Tab.Screen
          name="Students"
          component={TeacherStudentsScreen}
          options={{
            title: 'Students',
            headerShown: true,
            tabBarIcon: ({ focused }) => tabIcon('people-outline', focused),
          }}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesListScreen}
          options={{
            title: 'Messages',
            headerShown: true,
            tabBarIcon: ({ focused }) => tabIcon('chatbubbles-outline', focused),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={TeacherSettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          tabBarIcon: ({ focused }) => tabIcon('settings-outline', focused),
        }}
      />
    </Tab.Navigator>
  );
}

function ParentTabs() {
  const { colors } = useTheme();
  const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name'], focused: boolean) => (
    <Ionicons name={name} size={24} color={focused ? colors.tabActive : colors.tabInactive} />
  );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="Home"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          headerShown: true,
          headerTitle: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('home-outline', focused),
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotosPlaceholderScreen}
        options={{
          title: 'Photos',
          headerShown: true,
          tabBarIcon: ({ focused }) => tabIcon('images-outline', focused),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={ParentCalendarScreen}
        options={{
          title: 'Calendar',
          headerShown: true,
          tabBarIcon: ({ focused }) => tabIcon('calendar-outline', focused),
        }}
      />
        <Tab.Screen
          name="Messages"
          component={MessagesListScreen}
          options={{
            title: 'Messages',
            headerShown: true,
            tabBarIcon: ({ focused }) => tabIcon('chatbubbles-outline', focused),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={ParentSettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          tabBarIcon: ({ focused }) => tabIcon('settings-outline', focused),
        }}
      />
    </Tab.Navigator>
  );
}

export function MainTabs({ role }: { role: UserRole }) {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <RootStack.Screen
        name="MainTabs"
        component={role === 'teacher' ? TeacherTabs : ParentTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="Reports" component={TeacherReportsScreen} options={{ title: 'Daily report' }} />
      <RootStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
      <RootStack.Screen name="ChildProfile" component={ParentChildProfileScreen} options={{ title: 'Child' }} />
      <RootStack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen name="SelectChildToMessage" component={SelectChildToMessageScreen} options={{ title: 'Start conversation' }} />
      <RootStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
    </RootStack.Navigator>
  );
}
