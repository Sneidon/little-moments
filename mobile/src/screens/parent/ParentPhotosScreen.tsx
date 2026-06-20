import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { getCached, setCached, LIST_TTL_MS } from '../../utils/cache';
import { getInitials } from '../../utils';
import { isVideoMedia } from '../../utils/media';
import { EmptyState } from '../../components/EmptyState';
import type { Child } from '../../../../shared/types';
import type { DailyReport } from '../../../../shared/types';

const H_PAD = 16;
const POST_GAP = 20;
const REPORTS_PER_CHILD = 100;

type RootNav = { navigate: (name: string, params?: object) => void } | undefined;

export type ParentPhotosScreenProps = {
  navigation: {
    getParent: () => RootNav;
  };
};

type PhotoFeedItem = {
  key: string;
  schoolId: string;
  childId: string;
  reportId: string;
  imageUrl: string;
  mediaType?: string;
  timestamp: string;
  childName: string;
  childPhotoURL?: string;
  notes?: string;
  photoCategory?: string;
  forWholeClass?: boolean;
};

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function fetchParentChildren(uid: string): Promise<Child[]> {
  const cacheKey = `parent:children:${uid}`;
  const schoolsSnap = await getDocs(collection(db, 'schools'));
  const list: Child[] = [];
  for (const schoolDoc of schoolsSnap.docs) {
    const q = query(
      collection(db, 'schools', schoolDoc.id, 'children'),
      where('parentIds', 'array-contains', uid),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() } as Child));
  }
  if (list.length > 0) {
    await setCached(cacheKey, list, LIST_TTL_MS);
  }
  return list;
}

export function ParentPhotosScreen({ navigation }: ParentPhotosScreenProps) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const rootNav = navigation.getParent() as RootNav;

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [children, setChildren] = useState<Child[]>([]);
  const [photos, setPhotos] = useState<PhotoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPhotos = useCallback(async () => {
    const uid = profile?.uid;
    if (!uid) {
      setChildren([]);
      setPhotos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let list: Child[] = [];
    try {
      list = await fetchParentChildren(uid);
      setChildren(list);
    } catch {
      setChildren([]);
      setPhotos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (list.length === 0) {
      setPhotos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const items: PhotoFeedItem[] = [];
    for (const child of list) {
      try {
        const q = query(
          collection(db, 'schools', child.schoolId, 'children', child.id, 'reports'),
          orderBy('timestamp', 'desc'),
          limit(REPORTS_PER_CHILD)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as DailyReport;
          if (data.type !== 'incident' || !data.imageUrl?.trim()) return;
          const ts =
            typeof data.timestamp === 'string'
              ? data.timestamp
              : typeof data.createdAt === 'string'
                ? data.createdAt
                : '';
          const notes = data.notes?.trim();
          items.push({
            key: `${child.schoolId}-${child.id}-${docSnap.id}`,
            schoolId: child.schoolId,
            childId: child.id,
            reportId: docSnap.id,
            imageUrl: data.imageUrl.trim(),
            mediaType: data.mediaType,
            timestamp: ts,
            childName: child.preferredName?.trim() || child.name,
            childPhotoURL: child.photoURL,
            notes: notes || undefined,
            photoCategory: data.photoCategory?.trim() || undefined,
            forWholeClass: data.forWholeClass === true,
          });
        });
      } catch {
        // Skip this child's reports on permission or index errors
      }
    }

    items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    setPhotos(items);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.uid]);

  useEffect(() => {
    setLoading(true);
    void loadPhotos();
  }, [loadPhotos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPhotos();
  }, [loadPhotos]);

  const openDetail = useCallback(
    (item: PhotoFeedItem) => {
      rootNav?.navigate('ReportDetail', {
        schoolId: item.schoolId,
        childId: item.childId,
        reportId: item.reportId,
      });
    },
    [rootNav]
  );

  const renderPost = useCallback(
    ({ item }: { item: PhotoFeedItem }) => {
      const isVideo = isVideoMedia(item.mediaType, item.imageUrl);
      const when = formatRelativeTime(item.timestamp);
      const categoryLine = item.photoCategory ? item.photoCategory : 'Moment from school';

      return (
        <View style={styles.postCard}>
          <TouchableOpacity
            style={styles.postHeader}
            onPress={() => openDetail(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.childName}, ${when}`}
          >
            {item.childPhotoURL ? (
              <Image source={{ uri: item.childPhotoURL }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.avatarBg }]}>
                <Text style={[styles.avatarInitials, { color: colors.avatarText }]}>
                  {getInitials(item.childName)}
                </Text>
              </View>
            )}
            <View style={styles.headerTextCol}>
              <Text style={styles.headerName} numberOfLines={1}>
                {item.childName}
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {when}
                {when ? ' · ' : ''}
                {categoryLine}
              </Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openDetail(item)}
            activeOpacity={0.95}
            accessibilityRole="imagebutton"
            accessibilityLabel={isVideo ? 'Video, tap for details' : 'Media, tap for details'}
          >
            <View style={styles.mediaFrame}>
              {isVideo ? (
                <View style={[styles.mediaFill, styles.videoPlaceholder]}>
                  <View style={[styles.playCircle, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                    <Ionicons name="play" size={36} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.videoLabel}>Video</Text>
                </View>
              ) : (
                <Image source={{ uri: item.imageUrl }} style={styles.mediaFill} resizeMode="cover" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.9} style={styles.captionBlock}>
            {item.notes ? (
              <Text style={styles.caption}>
                <Text style={styles.captionName}>{item.childName}</Text>
                <Text style={styles.captionBody}> {item.notes}</Text>
              </Text>
            ) : (
              <Text style={styles.captionMuted}>Tap to view details and full caption.</Text>
            )}
            {item.forWholeClass ? (
              <View style={[styles.tagPill, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="people" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.tagPillText, { color: colors.primary }]}>Shared with the whole class</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      );
    },
    [colors, openDetail, styles]
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <EmptyState
          icon="people-outline"
          title="No children linked"
          subtitle="When your school links your account to a child, their media will appear here."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.key}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title="No media yet"
            subtitle="When teachers share photos and videos from the day, they will show up here."
          />
        }
      />
    </View>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (w: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[w] });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    listContent: {
      paddingHorizontal: H_PAD,
      paddingTop: 12,
      paddingBottom: 32,
      flexGrow: 1,
    },

    postCard: {
      marginBottom: POST_GAP,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      ...(!isDark && Platform.OS === 'ios'
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
          }
        : {}),
      ...(!isDark && Platform.OS === 'android' ? { elevation: 3 } : {}),
    },

    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
    },
    avatarInitials: {
      fontSize: 15,
      ...f('bold'),
    },
    headerTextCol: {
      flex: 1,
      minWidth: 0,
    },
    headerName: {
      fontSize: 15,
      color: colors.text,
      ...f('semiBold'),
    },
    headerMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      ...f('regular'),
    },

    mediaFrame: {
      width: '100%',
      backgroundColor: isDark ? '#111' : '#000',
    },
    mediaFill: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: isDark ? '#1a1a1c' : colors.skeletonHighlight,
    },
    videoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    playCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoLabel: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      ...f('semiBold'),
    },

    captionBlock: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      ...f('regular'),
    },
    captionName: {
      ...f('semiBold'),
      color: colors.text,
    },
    captionBody: {
      ...f('regular'),
      color: colors.textSecondary,
    },
    captionMuted: {
      fontSize: 14,
      color: colors.textMuted,
      ...f('medium'),
      lineHeight: 20,
    },
    tagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    tagPillText: {
      fontSize: 12,
      ...f('semiBold'),
    },
  });
}
