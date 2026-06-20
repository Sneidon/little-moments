import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import type { RootStackParamList } from '../../navigation/MainTabs';
import { navigateFromNotificationData } from '../../hooks/useNotificationNavigation';
import {
  isInAppNotificationRead,
  markInAppNotificationRead,
} from '../../services/inAppNotifications';

type Props = NativeStackScreenProps<RootStackParamList, 'UserNotifications'>;

type NotificationItem = {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  schoolId?: string;
  childId?: string;
  reportId?: string;
  announcementId?: string;
  eventId?: string;
  reportType?: string;
  chatId?: string;
  classId?: string;
  createdAt?: string;
  read?: boolean;
};

function formatWhen(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function UserNotificationsScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NotificationItem) })));
        setLoadError(null);
      },
      (error) => {
        console.warn('Failed to load user notifications:', error);
        setItems([]);
        setLoadError('Notifications are not available yet.');
      }
    );
    return unsub;
  }, [profile?.uid]);

  const openItem = async (item: NotificationItem) => {
    const uid = profile?.uid;
    if (!uid) return;
    const alreadyRead = isInAppNotificationRead(item);
    if (!alreadyRead) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      await markInAppNotificationRead(uid, item.id);
    }
    navigateFromNotificationData(
      navigation,
      {
        type: item.type,
        schoolId: item.schoolId,
        childId: item.childId,
        reportId: item.reportId,
        announcementId: item.announcementId,
        eventId: item.eventId,
        reportType: item.reportType,
        chatId: item.chatId,
        classId: item.classId,
      },
      profile?.role === 'parent'
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.listContent}
        renderItem={({ item }) => {
          const unread = !isInAppNotificationRead(item);
          return (
          <TouchableOpacity style={[styles.row, unread && styles.rowUnread]} onPress={() => openItem(item)}>
            <View style={styles.iconWrap}>
              <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={18} color={colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title || 'Notification'}
              </Text>
              {!!item.body && (
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
              <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={30} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{loadError ? 'Notifications unavailable' : 'No notifications yet'}</Text>
            <Text style={styles.emptyText}>
              {loadError ? loadError : 'New alerts will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    listContent: {
      padding: 12,
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      borderColor: colors.cardBorder,
      padding: 12,
      gap: 10,
    },
    rowUnread: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    iconWrap: {
      width: 28,
      alignItems: 'center',
      paddingTop: 2,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontFamily: font.semiBold,
      fontSize: 15,
    },
    body: {
      color: colors.textSecondary,
      fontFamily: font.regular,
      fontSize: 13,
      marginTop: 2,
    },
    when: {
      color: colors.textMuted,
      fontFamily: font.regular,
      fontSize: 12,
      marginTop: 6,
    },
    emptyWrap: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 16,
    },
    emptyCard: {
      alignItems: 'center',
      borderRadius: 14,
      paddingVertical: 22,
      paddingHorizontal: 14,
    },
    emptyTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: font.semiBold,
      fontSize: 16,
    },
    emptyText: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: font.regular,
      fontSize: 13,
    },
  });
}
