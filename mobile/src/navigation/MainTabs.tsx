import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Tab = createBottomTabNavigator();
const TeacherDashboardStack = createNativeStackNavigator();
const TeacherStudentsStack = createNativeStackNavigator();
const ParentHomeStack = createNativeStackNavigator();

function TeacherDashboardNav() {
  return (
    <TeacherDashboardStack.Navigator>
      <TeacherDashboardStack.Screen name="TeacherHome" component={TeacherHomeScreen} options={{ title: 'Dashboard' }} />
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

export function MainTabs({ role }: { role: UserRole }) {
  if (role === 'teacher') {
    return (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" component={TeacherDashboardNav} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="AddUpdate" component={AddUpdateScreen} options={{ title: 'Add Update', headerShown: true, headerTitle: 'Add update' }} />
        <Tab.Screen name="Students" component={TeacherStudentsNav} options={{ title: 'Students' }} />
        <Tab.Screen name="Messages" component={MessagesPlaceholderScreen} options={{ title: 'Messages', headerShown: true }} />
        <Tab.Screen name="Settings" component={TeacherSettingsScreen} options={{ title: 'Settings', headerShown: true }} />
      </Tab.Navigator>
    );
  }
  if (role === 'parent') {
    return (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={ParentHomeNav} options={{ title: 'Home' }} />
        <Tab.Screen name="Photos" component={PhotosPlaceholderScreen} options={{ title: 'Photos', headerShown: true }} />
        <Tab.Screen name="Calendar" component={ParentCalendarScreen} options={{ title: 'Calendar' }} />
        <Tab.Screen name="Messages" component={MessagesPlaceholderScreen} options={{ title: 'Messages', headerShown: true }} />
        <Tab.Screen name="Settings" component={ParentSettingsScreen} options={{ title: 'Settings', headerShown: true }} />
      </Tab.Navigator>
    );
  }
  return null;
}
