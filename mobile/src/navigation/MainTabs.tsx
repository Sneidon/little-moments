import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { font } from '../theme/typography';
import type { UserRole } from '../../../shared/types';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherReportsScreen } from '../screens/teacher/TeacherReportsScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherSettingsScreen } from '../screens/teacher/TeacherSettingsScreen';
import { AnnouncementsScreen } from '../screens/shared/AnnouncementsScreen';
import { EventsScreen } from '../screens/shared/EventsScreen';
import { MessagesListScreen } from '../screens/shared/MessagesListScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { SelectChildToMessageScreen } from '../screens/teacher/SelectChildToMessageScreen';
import { BroadcastToClassScreen } from '../screens/teacher/BroadcastToClassScreen';
import { ParentHomeScreen } from '../screens/parent/ParentHomeScreen';
import { ParentChildProfileScreen } from '../screens/parent/ParentChildProfileScreen';
import { ParentSettingsScreen } from '../screens/parent/ParentSettingsScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { ParentNotificationsScreen } from '../screens/parent/ParentNotificationsScreen';
import { PhotosPlaceholderScreen } from '../screens/shared/PhotosPlaceholderScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';
import { ParentSelectChildToMessageScreen } from '../screens/parent/ParentSelectChildToMessageScreen';
import { DailyCommunicationScreen } from '../screens/teacher/DailyCommunicationScreen';
import { EditChildProfileScreen } from '../screens/parent/EditChildProfileScreen';
import { useEditChildProfileParams } from '../screens/parent/useEditChildProfileParams';
import { EditChildProfileTeacherScreen } from '../screens/teacher/EditChildProfileTeacherScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';

function EditChildProfileScreenWrapper() {
  const navigation = useNavigation();
  const { child, schoolId } = useEditChildProfileParams();
  const goBack = () => (navigation as { goBack: () => void }).goBack();
  if (!child || !schoolId) return null;
  return <EditChildProfileScreen child={child} schoolId={schoolId} onSaved={goBack} onCancel={goBack} />;
}

function EditChildProfileTeacherScreenWrapper() {
  const navigation = useNavigation();
  const { child, schoolId } = useEditChildProfileParams();
  const goBack = () => (navigation as { goBack: () => void }).goBack();
  if (!child || !schoolId) return null;
  return <EditChildProfileTeacherScreen child={child} schoolId={schoolId} onSaved={goBack} onCancel={goBack} />;
}

export type RootStackParamList = {
  MainTabs: undefined;
  AddUpdate: { initialType?: string; initialChildId?: string } | undefined;
  Reports: { childId: string };
  Announcements: undefined;
  Events: undefined;
  ChildProfile: { childId: string; schoolId: string };
  ParentAnnouncements: undefined;
  SelectChildToMessage: undefined;
  ParentSelectChildToMessage: undefined;
  BroadcastToClass: undefined;
  ChatThread: { chatId: string; schoolId: string };
  DailyCommunication: undefined;
  EditChildProfile: { childId: string; schoolId: string };
  EditChildProfileTeacher: { childId: string; schoolId: string };
  ParentProfile: undefined;
  ParentNotifications: undefined;
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
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.cardBorder,
        },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TeacherHomeScreen}
        options={{
          title: 'Dashboard',
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          tabBarIcon: ({ focused }) => tabIcon('grid', focused),
        }}
      />
        <Tab.Screen
          name="Students"
          component={TeacherStudentsScreen}
          options={{
            title: 'Students',
            headerShown: true,
            tabBarIcon: ({ focused }) => tabIcon('school-outline', focused),
          }}
        />
        <Tab.Screen
          name="MessagesList"
          component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
          options={{
            title: 'Inbox',
            headerShown: true,
            headerTitle: 'Messages',
            tabBarIcon: ({ focused }) => tabIcon('mail-outline', focused),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={TeacherSettingsScreen}
        options={{
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ({ focused }) => tabIcon('person-outline', focused),
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
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.cardBorder,
        },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10 },
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
          name="MessagesList"
          component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
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
      <RootStack.Screen
        name="AddUpdate"
        component={AddUpdateScreen as React.ComponentType<Record<string, unknown>>}
        options={{ title: 'Add Update', headerBackTitle: 'Back' }}
      />
      <RootStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
      <RootStack.Screen name="ChildProfile" component={ParentChildProfileScreen} options={{ title: 'Daily report' }} />
      <RootStack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen name="SelectChildToMessage" component={SelectChildToMessageScreen} options={{ title: 'Start conversation' }} />
      <RootStack.Screen name="ParentSelectChildToMessage" component={ParentSelectChildToMessageScreen} options={{ title: 'Message teacher' }} />
      <RootStack.Screen name="BroadcastToClass" component={BroadcastToClassScreen} options={{ title: 'Message all in class' }} />
      <RootStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
      <RootStack.Screen name="DailyCommunication" component={DailyCommunicationScreen} options={{ title: 'Planned activity' }} />
      <RootStack.Screen name="EditChildProfile" component={EditChildProfileScreenWrapper} options={{ title: 'Edit child' }} />
      <RootStack.Screen name="EditChildProfileTeacher" component={EditChildProfileTeacherScreenWrapper} options={{ title: 'Edit child' }} />
      <RootStack.Screen name="ParentProfile" component={ParentProfileScreen} options={{ title: 'Profile' }} />
      <RootStack.Screen name="ParentNotifications" component={ParentNotificationsScreen} options={{ title: 'Notifications' }} />
    </RootStack.Navigator>
  );
}
