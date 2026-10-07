import React, { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundIconButton } from '../../components/brand/RoundIconButton';
import { useTheme } from '../../context/ThemeContext';
import { PostAttachments, PostHero, PostLoading, PostMissing } from '../../features/school-post';
import type { RootStackParamList } from '../../navigation/types';
import { AnnouncementSummary } from './announcements/AnnouncementSummary';
import { useAnnouncementDetail } from './announcements/useAnnouncementDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentAnnouncementDetail'>;

export function ParentAnnouncementDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { announcement, loading, share } = useAnnouncementDetail(route.params.schoolId, route.params.announcementId);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={share}
          style={styles.headerIconBtn}
          disabled={!announcement}
          accessibilityRole="button"
          accessibilityLabel="Share announcement"
        >
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, share, announcement, colors.primary]);

  if (loading) return <PostLoading label="Loading announcement…" />;
  if (!announcement) {
    return (
      <PostMissing
        icon="megaphone-outline"
        title="We couldn't load this announcement"
        body="It may have been removed, or there was a connection problem. Try again from the announcements list."
        action={
          <RoundIconButton
            icon="chevron-back"
            variant="inverse"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 20 }}
          />
        }
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {announcement.imageUrl ? <PostHero uri={announcement.imageUrl} mediaType={announcement.mediaType} /> : null}
        <AnnouncementSummary announcement={announcement} />
        <PostAttachments
          body={announcement.body?.trim() ? announcement.body : undefined}
          bodyTitle="Message"
          documents={announcement.documents}
          links={announcement.links}
          imagesTitle="Photos & images"
          imageFallback="Image"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerIconBtn: { marginRight: 8, padding: 6 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
});
