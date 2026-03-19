import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '../../../shared/types';
import type { ColorPalette } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { font } from '../theme/typography';
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
import { ParentPhotosScreen } from '../screens/parent/ParentPhotosScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentEventDetailScreen } from '../screens/parent/ParentEventDetailScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';
import { ParentSelectChildToMessageScreen } from '../screens/parent/ParentSelectChildToMessageScreen';
import { DailyCommunicationScreen } from '../screens/teacher/DailyCommunicationScreen';
import { EditChildProfileScreen } from '../screens/parent/EditChildProfileScreen';
import { useEditChildProfileParams } from '../screens/parent/useEditChildProfileParams';
import { EditChildProfileTeacherScreen } from '../screens/teacher/EditChildProfileTeacherScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';
import { ReportDetailScreen } from '../screens/shared/ReportDetailScreen';

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
  ReportDetail: { schoolId: string; childId: string; reportId: string };
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
  ParentEventDetail: { schoolId: string; eventId: string };
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Fixed box so glyphs of different shapes align in the tab bar. */
const TAB_ICON_SLOT = 28;

/**
 * Outline when inactive, solid when focused (Ionicons `-outline` vs base name).
 * Centered in a fixed slot so tabs line up visually.
 */
function tabBarIconPair(outline: IoniconName, filled: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <View
      style={{
        width: TAB_ICON_SLOT,
        height: TAB_ICON_SLOT,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={focused ? filled : outline} size={size} color={color} />
    </View>
  );
}

function tabBarStyleOptions(colors: ColorPalette) {
  return {
    tabBarActiveTintColor: colors.tabActive,
    tabBarInactiveTintColor: colors.tabInactive,
    tabBarStyle: {
      backgroundColor: colors.tabBarBg,
      borderTopColor: colors.cardBorder,
    },
  };
}

function TeacherTabs() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: font.semiBold,
          fontSize: 17,
          color: colors.text,
        },
        headerShadowVisible: !isDark,
        ...tabBarStyleOptions(colors),
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TeacherHomeScreen}
        options={{
          headerShown: false,
          title: 'Dashboard',
          tabBarIcon: tabBarIconPair('grid-outline', 'grid'),
        }}
      />
      <Tab.Screen
        name="Students"
        component={TeacherStudentsScreen}
        options={{
          headerShown: true,
          title: 'Students',
          tabBarIcon: tabBarIconPair('school-outline', 'school'),
        }}
      />
      <Tab.Screen
        name="MessagesList"
        component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
        options={{
          headerShown: true,
          title: 'Messages',
          tabBarIcon: tabBarIconPair('chatbubbles-outline', 'chatbubbles'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={TeacherSettingsScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: tabBarIconPair('person-outline', 'person'),
        }}
      />
    </Tab.Navigator>
  );
}

function ParentTabs() {
  const { colors, isDark } = useTheme();
  const tabHeader = { headerShown: true as const };
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: font.semiBold,
          fontSize: 17,
          color: colors.text,
        },
        headerShadowVisible: !isDark,
        ...tabBarStyleOptions(colors),
      }}
    >
      <Tab.Screen
        name="Home"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          headerShown: true,
          tabBarIcon: tabBarIconPair('home-outline', 'home'),
        }}
      />
      <Tab.Screen
        name="Photos"
        component={ParentPhotosScreen}
        options={{
          title: 'Photos',
          ...tabHeader,
          tabBarIcon: tabBarIconPair('images-outline', 'images'),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={ParentCalendarScreen}
        options={{
          title: 'Calendar',
          ...tabHeader,
          tabBarIcon: tabBarIconPair('calendar-outline', 'calendar'),
        }}
      />
      <Tab.Screen
        name="MessagesList"
        component={MessagesListScreen as React.ComponentType<Record<string, unknown>>}
        options={{
          title: 'Messages',
          ...tabHeader,
          tabBarIcon: tabBarIconPair('chatbubbles-outline', 'chatbubbles'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ParentSettingsScreen}
        options={{
          title: 'Settings',
          ...tabHeader,
          tabBarIcon: tabBarIconPair('settings-outline', 'settings'),
        }}
      />
    </Tab.Navigator>
  );
}

export function MainTabs({ role }: { role: UserRole }) {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}
    >
      <RootStack.Screen
        name="MainTabs"
        component={role === 'teacher' ? TeacherTabs : ParentTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="Reports" component={TeacherReportsScreen} options={{ title: 'Daily report' }} />
      <RootStack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Update details' }}
      />
      <RootStack.Screen
        name="AddUpdate"
        component={AddUpdateScreen as React.ComponentType<Record<string, unknown>>}
        options={{ title: 'Add Update' }}
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
      <RootStack.Screen
        name="ParentEventDetail"
        component={ParentEventDetailScreen}
        options={{ title: 'Event' }}
      />
    </RootStack.Navigator>
  );
}
