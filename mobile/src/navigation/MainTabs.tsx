import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '../../../shared/types';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherReportsScreen } from '../screens/teacher/TeacherReportsScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherSettingsScreen } from '../screens/teacher/TeacherSettingsScreen';
import { AnnouncementsScreen } from '../screens/shared/AnnouncementsScreen';
import { EventsScreen } from '../screens/shared/EventsScreen';
import { MessagesPlaceholderScreen } from '../screens/shared/MessagesPlaceholderScreen';
import { ParentHomeScreen } from '../screens/parent/ParentHomeScreen';
import { ParentChildProfileScreen } from '../screens/parent/ParentChildProfileScreen';
import { ParentSettingsScreen } from '../screens/parent/ParentSettingsScreen';
import { PhotosPlaceholderScreen } from '../screens/shared/PhotosPlaceholderScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';

type TeacherDashboardParamList = {
  TeacherHome: undefined;
  Reports: { childId: string };
  Announcements: undefined;
  Events: undefined;
};
type TeacherStudentsParamList = {
  StudentsList: undefined;
  Reports: { childId: string };
};
type ParentHomeParamList = {
  ParentHome: undefined;
  ChildProfile: { childId: string; schoolId: string };
  Announcements: undefined;
  Events: undefined;
};

const Tab = createBottomTabNavigator();
const TeacherDashboardStack = createNativeStackNavigator<TeacherDashboardParamList>();
const TeacherStudentsStack = createNativeStackNavigator<TeacherStudentsParamList>();
const ParentHomeStack = createNativeStackNavigator<ParentHomeParamList>();

function TeacherDashboardNav() {
  return (
    <TeacherDashboardStack.Navigator>
      <TeacherDashboardStack.Screen name="TeacherHome" component={TeacherHomeScreen} options={{ title: 'Home' }} />
      <TeacherDashboardStack.Screen name="Reports" component={TeacherReportsScreen} options={{ title: 'Daily report' }} />
      <TeacherDashboardStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <TeacherDashboardStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
    </TeacherDashboardStack.Navigator>
  );
}

function TeacherStudentsNav() {
  return (
    <TeacherStudentsStack.Navigator>
      <TeacherStudentsStack.Screen name="StudentsList" component={TeacherStudentsScreen} options={{ title: 'Students' }} />
      <TeacherStudentsStack.Screen name="Reports" component={TeacherReportsScreen} options={{ title: 'Daily report' }} />
    </TeacherStudentsStack.Navigator>
  );
}

function ParentHomeNav() {
  return (
    <ParentHomeStack.Navigator>
      <ParentHomeStack.Screen name="ParentHome" component={ParentHomeScreen} options={{ title: 'Home' }} />
      <ParentHomeStack.Screen name="ChildProfile" component={ParentChildProfileScreen} options={{ title: 'Child' }} />
      <ParentHomeStack.Screen name="Announcements" component={ParentAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <ParentHomeStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
    </ParentHomeStack.Navigator>
  );
}

const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name'], focused: boolean) => (
  <Ionicons name={name} size={24} color={focused ? '#6366f1' : '#94a3b8'} />
);

export function MainTabs({ role }: { role: UserRole }) {
  if (role === 'teacher') {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={TeacherDashboardNav}
          options={{
            title: 'Dashboard',
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
          component={TeacherStudentsNav}
          options={{
            title: 'Students',
            tabBarIcon: ({ focused }) => tabIcon('people-outline', focused),
          }}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesPlaceholderScreen}
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
  if (role === 'parent') {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
        }}
      >
        <Tab.Screen
          name="Home"
          component={ParentHomeNav}
          options={{
            title: 'Home',
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
          component={MessagesPlaceholderScreen}
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
  return null;
}
