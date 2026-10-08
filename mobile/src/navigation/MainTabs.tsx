import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { UserRole } from '@shared/types';
import { useAuth } from '../context/AuthContext';
import { usePushNotificationRegistration } from '../hooks/usePushNotificationRegistration';
import { TeacherReportsScreen } from '../screens/teacher/TeacherReportsScreen';
import { TeacherNotificationSettingsScreen } from '../screens/teacher/TeacherNotificationSettingsScreen';
import { AnnouncementsScreen } from '../screens/shared/AnnouncementsScreen';
import { EventsScreen } from '../screens/shared/EventsScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { SelectChildToMessageScreen } from '../screens/teacher/SelectChildToMessageScreen';
import { BroadcastToClassScreen } from '../screens/teacher/BroadcastToClassScreen';
import { ParentChildProfileScreen } from '../screens/parent/ParentChildProfileScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { ParentNotificationsScreen } from '../screens/parent/ParentNotificationsScreen';
import { ParentEventDetailScreen } from '../screens/parent/ParentEventDetailScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';
import { ParentAnnouncementDetailScreen } from '../screens/parent/ParentAnnouncementDetailScreen';
import { ParentSelectChildToMessageScreen } from '../screens/parent/ParentSelectChildToMessageScreen';
import { ParentPendingApprovalScreen } from '../screens/parent/ParentPendingApprovalScreen';
import { ParentAddSiblingScreen } from '../screens/parent/ParentAddSiblingScreen';
import { DailyCommunicationScreen } from '../screens/teacher/DailyCommunicationScreen';
import { AddUpdateScreen } from '../screens/teacher/AddUpdateScreen';
import { ReportDetailScreen } from '../screens/shared/ReportDetailScreen';
import { UserNotificationsScreen } from '../screens/shared/UserNotificationsScreen';
import { EditChildProfileScreenWrapper, EditChildProfileTeacherScreenWrapper } from './EditChildProfileRoutes';
import { ParentTabs } from './ParentTabs';
import { TeacherTabs } from './TeacherTabs';
import { useStackScreenOptions } from './stackScreenOptions';
import type { RootStackParamList } from './types';

export type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

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
