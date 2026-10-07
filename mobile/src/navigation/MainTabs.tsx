import React from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabIcon,
  type NativeBottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs/unstable';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { UserRole } from '@shared/types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePushNotificationRegistration } from '../hooks/usePushNotificationRegistration';
import { brandFont, font } from '../theme/typography';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherReportsScreen } from '../screens/teacher/TeacherReportsScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherSettingsScreen } from '../screens/teacher/TeacherSettingsScreen';
import { TeacherNotificationSettingsScreen } from '../screens/teacher/TeacherNotificationSettingsScreen';
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
import { ParentAnnouncementDetailScreen } from '../screens/parent/ParentAnnouncementDetailScreen';
import { ParentSelectChildToMessageScreen } from '../screens/parent/ParentSelectChildToMessageScreen';
import { ParentPendingApprovalScreen } from '../screens/parent/ParentPendingApprovalScreen';
import { ParentAddSiblingScreen } from '../screens/parent/ParentAddSiblingScreen';
import { DailyCommunicationScreen } from '../screens/teacher/DailyCommunicationScreen';
import { EditChildProfileScreen } from '../screens/parent/EditChildProfileScreen';
import { useEditChildProfileParams } from '../screens/parent/useEditChildProfileParams';
import { EditChildProfileTeacherScreen } from '../screens/teacher/EditChildProfileTeacherScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';
import { ReportDetailScreen } from '../screens/shared/ReportDetailScreen';
import { UserNotificationsScreen } from '../screens/shared/UserNotificationsScreen';
import { NotificationBellButton } from '../components/NotificationBellButton';
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';
import { useStackScreenOptions } from './stackScreenOptions';
import { formatTabBadgeCount } from '../utils/chatUnread';

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
  ParentAnnouncementDetail: { schoolId: string; announcementId: string };
  SelectChildToMessage: undefined;
  ParentSelectChildToMessage: undefined;
  BroadcastToClass: undefined;
  ChatThread: { chatId: string; schoolId: string; otherDisplayName?: string };
  DailyCommunication: undefined;
  EditChildProfile: { childId: string; schoolId: string };
  EditChildProfileTeacher: { childId: string; schoolId: string };
  ParentProfile: undefined;
  ParentNotifications: undefined;
  TeacherNotificationSettings: undefined;
  ParentEventDetail: { schoolId: string; eventId: string };
  UserNotifications: undefined;
  ParentAddSibling: undefined;
};

const Tab = createNativeBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

type SfSymbolName = Extract<NativeBottomTabIcon, { type: 'sfSymbol' }>['name'];

/**
 * Native tab icon: SF Symbol on iOS (outline, filled when focused), and a PNG
 * rendered from the app's icon fonts on Android (see scripts/build-tab-icons.py).
 */
function tabIcon(sfOutline: SfSymbolName, sfFilled: SfSymbolName, androidSource: ImageSourcePropType) {
  return ({ focused }: { focused: boolean }): NativeBottomTabIcon =>
    Platform.OS === 'ios'
      ? { type: 'sfSymbol', name: focused ? sfFilled : sfOutline }
      : { type: 'image', source: androidSource };
}

const TAB_ICONS = {
  dashboard: tabIcon('square.grid.2x2', 'square.grid.2x2.fill', require('../../assets/tab-icons/dashboard.png')),
  students: tabIcon('figure.child', 'figure.child', require('../../assets/tab-icons/students.png')),
  messages: tabIcon(
    'bubble.left.and.bubble.right',
    'bubble.left.and.bubble.right.fill',
    require('../../assets/tab-icons/messages.png')
  ),
  profile: tabIcon('person', 'person.fill', require('../../assets/tab-icons/profile.png')),
  home: tabIcon('house', 'house.fill', require('../../assets/tab-icons/home.png')),
  media: tabIcon('photo.on.rectangle', 'photo.on.rectangle.angled', require('../../assets/tab-icons/media.png')),
  calendar: tabIcon('calendar', 'calendar', require('../../assets/tab-icons/calendar.png')),
  settings: tabIcon('gearshape', 'gearshape.fill', require('../../assets/tab-icons/settings.png')),
};

/**
 * Shared native tab bar + header options. On iOS 26+ the tab bar is Liquid Glass
 * (its background follows the content and can't be overridden); Android uses the
 * Material bar with the sunflower active indicator from the redesign.
 */
function useTabScreenOptions() {
  const { colors, brand, category, isDark } = useTheme();
  return ({ navigation }: { navigation: { getParent: () => unknown } }): NativeBottomTabNavigationOptions => ({
    headerShown: false,
    headerStyle: { backgroundColor: brand.background },
    headerTintColor: brand.textPrimary,
    headerTitleStyle: { fontFamily: brandFont.display800, fontSize: 18, color: brand.textPrimary },
    headerShadowVisible: false,
    headerRight: () => (
      <NotificationBellButton
        colors={colors}
        onPress={() =>
          (navigation.getParent() as { navigate: (name: string) => void } | undefined)?.navigate(
            'UserNotifications'
          )
        }
      />
    ),
    tabBarActiveTintColor: Platform.OS === 'ios' ? brand.primaryButton : category.onCategory,
    tabBarInactiveTintColor: brand.textSecondary,
    tabBarActiveIndicatorColor: category.activity,
    tabBarStyle: { backgroundColor: brand.surface },
    tabBarLabelStyle: { fontFamily: brandFont.body700, fontSize: 12 },
    tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#FFFFFF' },
  });
}

function TeacherTabs() {
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

function ParentTabs() {
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
          ...tabHeader,
          tabBarIcon: TAB_ICONS.settings,
        }}
      />
    </Tab.Navigator>
  );
}

export function MainTabs({ role }: { role: UserRole }) {
  const { profile } = useAuth();
  const shouldGateParent = role === 'parent' && profile?.parentStatus && profile.parentStatus !== 'ACTIVE';
  usePushNotificationRegistration(!shouldGateParent);
  const stackScreenOptions = useStackScreenOptions();
  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      <RootStack.Screen
        name="MainTabs"
        component={role === 'teacher' ? TeacherTabs : shouldGateParent ? ParentPendingApprovalScreen : ParentTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Reports"
        component={TeacherReportsScreen}
        options={{ title: 'Daily report', headerShown: false }}
      />
      <RootStack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Update details' }}
      />
      <RootStack.Screen
        name="AddUpdate"
        component={AddUpdateScreen as React.ComponentType<Record<string, unknown>>}
        options={{ title: 'Add Update', headerShown: false }}
      />
      <RootStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
      <RootStack.Screen
        name="ChildProfile"
        component={ParentChildProfileScreen}
        options={{ title: 'Daily report', headerShown: false }}
      />
      <RootStack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <RootStack.Screen
        name="ParentAnnouncementDetail"
        component={ParentAnnouncementDetailScreen}
        options={{ title: 'Announcement' }}
      />
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
        name="TeacherNotificationSettings"
        component={TeacherNotificationSettingsScreen}
        options={{ title: 'Notification settings' }}
      />
      <RootStack.Screen
        name="ParentEventDetail"
        component={ParentEventDetailScreen}
        options={{ title: 'Event' }}
      />
      <RootStack.Screen
        name="UserNotifications"
        component={UserNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <RootStack.Screen
        name="ParentAddSibling"
        component={ParentAddSiblingScreen as React.ComponentType<Record<string, unknown>>}
        options={{ title: 'Add child' }}
      />
    </RootStack.Navigator>
  );
}
