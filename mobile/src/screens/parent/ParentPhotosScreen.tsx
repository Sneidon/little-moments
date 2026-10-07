import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/EmptyState';
import type { RootStackParamList } from '../../navigation/types';
import { PhotoPost } from './photos/PhotoPost';
import { usePhotoFeed } from './photos/usePhotoFeed';
import type { PhotoFeedItem } from './photos/photoFeed';

export function ParentPhotosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { children, photos, loading, refreshing, onRefresh } = usePhotoFeed();

  const openDetail = useCallback(
    (item: PhotoFeedItem) =>
      navigation.navigate('ReportDetail', { schoolId: item.schoolId, childId: item.childId, reportId: item.reportId }),
    [navigation]
  );
  const renderPost = useCallback(({ item }: { item: PhotoFeedItem }) => <PhotoPost item={item} onOpen={openDetail} />, [openDetail]);
  const background = { backgroundColor: colors.backgroundSecondary };

  if (loading) {
    return (
      <View style={[styles.centered, background]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.centered, background]}>
        <EmptyState
          icon="people-outline"
          title="No children linked"
          subtitle="When your school links your account to a child, their media will appear here."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.list, background]}
      data={photos}
      keyExtractor={(item) => item.key}
      renderItem={renderPost}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <EmptyState
          icon="images-outline"
          title="No media yet"
          subtitle="When teachers share photos and videos from the day, they will show up here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
});
