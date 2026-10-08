import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { useTabBarClearance } from '../../hooks/useTabBarClearance';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { TabHeader } from '../../components/brand/TabHeader';
import { Skeleton } from '../../components/Skeleton';
import { radius, spacing } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { PhotoPost } from './photos/PhotoPost';
import { usePhotoFeed } from './photos/usePhotoFeed';
import type { PhotoFeedItem } from './photos/photoFeed';

export function ParentPhotosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { brand } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { children, photos, loading, refreshing, onRefresh } = usePhotoFeed();
  const tabBarClearance = useTabBarClearance();

  const openDetail = useCallback(
    (item: PhotoFeedItem) =>
      navigation.navigate('ReportDetail', { schoolId: item.schoolId, childId: item.childId, reportId: item.reportId }),
    [navigation]
  );
  const renderPost = useCallback(({ item }: { item: PhotoFeedItem }) => <PhotoPost item={item} onOpen={openDetail} />, [openDetail]);

  const empty = loading ? (
    <View style={styles.skeletons} accessibilityState={{ busy: true }}>
      {[0, 1].map((i) => (
        <Skeleton key={i} height={420} borderRadius={radius.card} />
      ))}
    </View>
  ) : children.length === 0 ? (
    <EmptyCard
      icon="people-outline"
      title="No children linked"
      body="When your school links your account to a child, their photos and videos will appear here."
    />
  ) : (
    <EmptyCard icon="images-outline" title="No media yet" body="When teachers share photos and videos from the day, they will show up here." />
  );

  return (
    <FlatList
      style={styles.screen}
      data={loading ? [] : photos}
      keyExtractor={(item) => item.key}
      renderItem={renderPost}
      ListHeaderComponent={<TabHeader overline="Moments" title="Media" style={styles.header} />}
      ListEmptyComponent={empty}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.onHeader} colors={[brand.headerBackground]} />}
    />
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    header: { marginBottom: spacing.gapL },
    content: { paddingHorizontal: spacing.screenX, flexGrow: 1 },
    skeletons: { gap: 14 },
  });
