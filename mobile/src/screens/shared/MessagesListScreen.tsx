import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton, OutlineButton } from '../../components/brand/Buttons';
import { BrandSkeletonStudentCard } from '../../components/brand/BrandSkeletons';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { TabHeader } from '../../components/brand/TabHeader';
import { ChatListRow } from '../../features/chat/ChatListRow';
import { useChatList, type ChatWithNames } from '../../features/chat/useChatList';
import { NATIVE_TAB_BAR_CLEARANCE_IOS, spacing, type as typeTokens, type BrandPalette } from '../../theme/tokens';
import { isChatUnreadForUser } from '../../utils/chatUnread';
import type { RootStackParamList } from '../../navigation/types';

export function MessagesListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const { brand } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(brand), [brand]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { chats, loading } = useChatList(refreshTrigger);
  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading, chats]);

  const isUnread = useCallback(
    (chat: ChatWithNames) => !!profile?.uid && !!profile.role && isChatUnreadForUser(chat, profile.uid, profile.role),
    [profile?.uid, profile?.role]
  );
  const unreadCount = useMemo(() => chats.filter(isUnread).length, [chats, isUnread]);

  const openChat = useCallback(
    (chat: ChatWithNames) =>
      navigation.navigate('ChatThread', { chatId: chat.id, schoolId: chat.schoolId, otherDisplayName: chat.otherDisplayName }),
    [navigation]
  );

  const header = <TabHeader overline={unreadCount > 0 ? `${unreadCount} unread` : 'Inbox'} title="Messages" />;

  if (loading) {
    return (
      <View style={styles.screen} accessibilityState={{ busy: true }}>
        <View style={styles.padded}>{header}</View>
        <View style={styles.loading}>
          {[1, 2, 3, 4, 5].map((i) => (
            <BrandSkeletonStudentCard key={i} compact />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ChatListRow chat={item} index={index} unread={isUnread(item)} onPress={openChat} />}
        ListHeaderComponent={
          <>
            {header}
            <View style={styles.actions}>
              {isTeacher ? (
                <>
                  <PrimaryButton
                    label="Message class"
                    icon="megaphone-outline"
                    size="s"
                    style={styles.action}
                    onPress={() => navigation.navigate('BroadcastToClass')}
                    accessibilityLabel="Message all parents in a class"
                  />
                  <OutlineButton
                    label="New chat"
                    icon="chatbubble-ellipses-outline"
                    size="s"
                    style={styles.action}
                    onPress={() => navigation.navigate('SelectChildToMessage')}
                    accessibilityLabel="Start a new chat"
                  />
                </>
              ) : (
                <PrimaryButton
                  label="Message teacher"
                  icon="person-outline"
                  size="s"
                  style={styles.action}
                  onPress={() => navigation.navigate('ParentSelectChildToMessage')}
                />
              )}
            </View>
            {chats.length > 0 ? (
              <Text style={styles.section} accessibilityRole="header">
                Conversations
              </Text>
            ) : null}
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyCard
            icon="chatbubbles-outline"
            title="No conversations yet"
            body={isTeacher ? 'Use Message class or New chat above to reach parents.' : 'Tap Message teacher above to start a conversation.'}
            style={styles.empty}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setRefreshTrigger((t) => t + 1);
            }}
            tintColor={brand.onHeader}
            colors={[brand.headerBackground]}
          />
        }
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + NATIVE_TAB_BAR_CLEARANCE_IOS : 24 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(brand: BrandPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    padded: { paddingHorizontal: spacing.screenX },
    list: { flexGrow: 1, paddingHorizontal: spacing.screenX },
    loading: { padding: spacing.screenX, gap: 10 },
    actions: { flexDirection: 'row', gap: 10, marginTop: spacing.gapL },
    action: { flex: 1 },
    section: { ...typeTokens.section, color: brand.textPrimary, marginTop: 24, marginBottom: 12, marginHorizontal: 4 },
    empty: { marginTop: spacing.gapL },
  });
}
