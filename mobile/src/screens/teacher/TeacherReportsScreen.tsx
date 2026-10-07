import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

import { getOrCreateChat } from '../../api/chat';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton } from '../../components/Skeleton';
import { brandFont } from '../../theme/typography';
import { getAge, getInitials, formatTime } from '../../utils';
import {
  type ReportWithExtras,
  getReportTitle,
  parseTimeWithDate,
  getReportDateStr,
} from '../../utils/childDailyReportDisplay';
import { HeaderBlock, Overline } from '../../components/brand/HeaderBlock';
import { RoundIconButton } from '../../components/brand/RoundIconButton';
import { PrimaryButton, OutlineButton } from '../../components/brand/Buttons';
import { StatTile } from '../../components/brand/StatTile';
import {
  radius,
  spacing,
  type as typeTokens,
  updateTypeStyle,
  type BrandPalette,
  type CategoryPalette,
} from '../../theme/tokens';

import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';

type ReportsRouteParams = { childId: string };
type Props = {
  route: { params: ReportsRouteParams };
  navigation: {
    navigate: (name: 'ReportDetail' | 'AddUpdate' | 'ChatThread', params?: object) => void;
    goBack: () => void;
  };
};

function getUpdateTypeLeadLabel(type: string): string {
  switch (type) {
    case 'meal':
      return 'Meal';
    case 'nap_time':
      return 'Nap Time';
    case 'nappy_change':
      return 'Nappy Change';
    case 'check_in':
      return 'Check In';
    case 'check_out':
      return 'Check Out';
    case 'activity':
      return 'Activity';
    case 'child_joined_class':
      return 'Joined class';
    case 'medication':
      return 'Medication';
    case 'incident':
      return 'Media';
    default:
      return type.replace(/_/g, ' ');
  }
}

function getTimelineTitle(item: ReportWithExtras): string {
  const lead = getUpdateTypeLeadLabel(item.type);
  const details = getReportTitle(item);
  if (details.trim().toLowerCase() === lead.trim().toLowerCase()) return lead;
  return `${lead}: ${details}`;
}

export function TeacherReportsScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { brand, category } = useTheme();
  const styles = useMemo(() => createStyles(brand, category), [brand, category]);
  const [child, setChild] = useState<Child | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [childLoading, setChildLoading] = useState(true);
  const [childMissing, setChildMissing] = useState(false);
  const [reports, setReports] = useState<ReportWithExtras[]>([]);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const schoolId = profile?.schoolId;
  const startOfDay = `${selectedDate}T00:00:00.000Z`;
  const endOfDay = `${selectedDate}T23:59:59.999Z`;

  const dayReports = reports.filter((r) => {
    const t = r.timestamp || r.createdAt;
    return t >= startOfDay && t <= endOfDay;
  });
  const sortedDayReports = [...dayReports].sort(
    (a, b) =>
      new Date(a.timestamp || a.createdAt).getTime() -
      new Date(b.timestamp || b.createdAt).getTime()
  );

  const meals = dayReports.filter((r) => r.type === 'meal').length;
  const naps = dayReports.filter((r) => r.type === 'nap_time');
  const nappy = dayReports.filter((r) => r.type === 'nappy_change').length;
  const activities = dayReports.filter(
    (r) =>
      r.type === 'activity' ||
      r.type === 'child_joined_class' ||
      r.type === 'medication' ||
      r.type === 'incident' ||
      r.type === 'check_in' ||
      r.type === 'check_out'
  ).length;

  let napDuration = '';
  if (naps.length > 0) {
    let totalMs = 0;
    const dateStr = selectedDate;
    for (const n of naps) {
      const r = n as ReportWithExtras;
      const reportDate = getReportDateStr(r) || dateStr;
      if (r.napStartTime && r.napEndTime) {
        const startMs = parseTimeWithDate(r.napStartTime, reportDate);
        const endMs = parseTimeWithDate(r.napEndTime, reportDate);
        if (!isNaN(startMs) && !isNaN(endMs)) {
          totalMs += endMs - startMs;
        } else {
          totalMs += 1.5 * 60 * 60 * 1000;
        }
      } else {
        totalMs += 1.5 * 60 * 60 * 1000;
      }
    }
    const hours = totalMs / (60 * 60 * 1000);
    napDuration =
      Number.isFinite(hours) && hours >= 0
        ? hours >= 1
          ? `${hours.toFixed(1)}h`
          : `${Math.round(hours * 60)}m`
        : '0h';
  } else {
    napDuration = '0h';
  }

  useEffect(() => {
    if (!schoolId || !childId) {
      setChildLoading(false);
      return;
    }
    let cancelled = false;
    setChildLoading(true);
    setChildMissing(false);
    setChild(null);
    setClassName(null);
    (async () => {
      try {
        const childRef = doc(db, 'schools', schoolId, 'children', childId);
        const snap = await getDoc(childRef);
        if (cancelled) return;
        if (!snap.exists()) {
          setChildMissing(true);
          return;
        }
        const data = snap.data() as Child;
        setChild({ ...data, id: snap.id } as Child);
        if (data.classId) {
          const classSnap = await getDoc(doc(db, 'schools', schoolId, 'classes', data.classId));
          if (!cancelled && classSnap.exists()) {
            setClassName((classSnap.data() as ClassRoom).name);
          }
        }
      } catch {
        if (!cancelled) setChildMissing(true);
      } finally {
        if (!cancelled) setChildLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId]);

  useEffect(() => {
    if (!schoolId || !childId) return;
    const q = query(
      collection(db, 'schools', schoolId, 'children', childId, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReportWithExtras))
      );
    });
    return () => unsub();
  }, [schoolId, childId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) <= today)
      setSelectedDate(d.toISOString().slice(0, 10));
  };

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date.toISOString().slice(0, 10));
  };

  const onMessageParents = useCallback(async () => {
    if (!schoolId || !child?.parentIds?.length) {
      Alert.alert('No parents', 'This child has no linked parents.');
      return;
    }
    const parentId = child.parentIds[0];
    setMessageLoading(true);
    try {
      const { chatId, schoolId: sid } = await getOrCreateChat(schoolId, childId, parentId);
      navigation.navigate('ChatThread', { chatId, schoolId: sid });
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  }, [schoolId, childId, child?.parentIds, navigation]);

  if (!schoolId) return null;

  const scrollBottom = 24 + Math.max(insets.bottom, 8);
  const nameParts = child?.name.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] ?? '';
  const restName = nameParts.slice(1).join(' ');
  const messageDisabled = childLoading || childMissing || messageLoading || !child?.parentIds?.length;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={category.onCategory}
            colors={[brand.headerBackground]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBlock variant="category" color={category.nap} paddingBottom={26} gap={22}>
          <View style={styles.headerTopRow}>
            <RoundIconButton
              icon="chevron-back"
              variant="onHeaderLight"
              accessibilityLabel="Back"
              onPress={() => navigation.goBack()}
            />
            <Overline color={category.onCategory}>Daily report</Overline>
          </View>

          {childLoading ? (
            <View style={styles.profileRow}>
              <Skeleton width={88} height={88} borderRadius={30} />
              <View style={styles.profileTextCol}>
                <Skeleton width="72%" height={30} borderRadius={8} style={{ marginBottom: 10 }} />
                <Skeleton width="48%" height={14} borderRadius={6} />
              </View>
            </View>
          ) : childMissing || !child ? (
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                <Ionicons name="person-outline" size={34} color={category.onCategory} />
              </View>
              <View style={styles.profileTextCol}>
                <Text style={styles.profileName} accessibilityRole="header">
                  Child not found
                </Text>
                <Text style={styles.profileMeta}>This student may have been removed.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.profileRow}>
              {child.photoURL ? (
                <Image source={{ uri: child.photoURL }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{getInitials(child.name)}</Text>
                </View>
              )}
              <View style={styles.profileTextCol}>
                <Text style={styles.profileName} accessibilityRole="header" accessibilityLabel={child.name}>
                  {firstName}
                  {restName ? `\n${restName}` : ''}
                </Text>
                <Text style={styles.profileMeta} numberOfLines={1}>
                  {getAge(child.dateOfBirth)}
                  {className ? ` · ${className}` : ''}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.datePill} accessibilityLabel="Choose day">
            <RoundIconButton
              icon="chevron-back"
              variant="raised"
              size={44}
              accessibilityLabel="Previous day"
              onPress={prevDay}
            />
            <TouchableOpacity
              style={styles.dateCenter}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${displayDate}. Choose a date`}
            >
              <Ionicons name="calendar-outline" size={18} color={brand.textPrimary} />
              <Text style={styles.dateText}>{displayDate}</Text>
            </TouchableOpacity>
            <RoundIconButton
              icon="chevron-forward"
              variant={isToday ? 'ghost' : 'raised'}
              size={44}
              accessibilityLabel="Next day"
              onPress={nextDay}
              disabled={isToday}
            />
          </View>
        </HeaderBlock>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={new Date(selectedDate + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'calendar' : 'default'}
              onChange={onDatePickerChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
                accessibilityRole="button"
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.body}>
          <View style={styles.actionRow}>
            <PrimaryButton
              label="Add update"
              icon="add"
              style={styles.actionBtn}
              onPress={() => navigation.navigate('AddUpdate', { initialChildId: childId })}
              disabled={childLoading || childMissing}
            />
            <OutlineButton
              label="Message parents"
              icon="chatbubble-outline"
              style={styles.actionBtn}
              onPress={onMessageParents}
              disabled={messageDisabled}
              loading={messageLoading}
            />
          </View>

          {childLoading ? (
            <Skeleton width={180} height={24} borderRadius={8} style={styles.sectionTitleSkeleton} />
          ) : (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {"Today's overview"}
            </Text>
          )}
          {childLoading ? (
            <View style={styles.grid}>
              {[0, 1].map((row) => (
                <View key={row} style={styles.gridRow}>
                  <Skeleton height={130} borderRadius={radius.card} style={{ flex: 1 }} />
                  <Skeleton height={130} borderRadius={radius.card} style={{ flex: 1 }} />
                </View>
              ))}
            </View>
          ) : childMissing ? (
            <Text style={styles.unavailableHint}>Overview unavailable</Text>
          ) : (
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <StatTile label="Meals" value={meals} suffix="/3" icon="restaurant-outline" color={category.meal} />
                <StatTile label="Nap" value={napDuration} icon="moon-outline" color={category.napStat} />
              </View>
              <View style={styles.gridRow}>
                <StatTile label="Nappy" value={nappy} icon="water-outline" color={category.attendance} />
                <StatTile
                  label="Activities"
                  value={activities}
                  icon="color-palette-outline"
                  color={category.activity}
                />
              </View>
            </View>
          )}

          {childLoading ? (
            <Skeleton width={200} height={24} borderRadius={8} style={styles.sectionTitleSkeleton} />
          ) : (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {isToday ? "Today's Updates" : `Updates · ${displayDate}`}
            </Text>
          )}
          {childLoading ? (
            <View style={styles.timelineList}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.timelineCard}>
                  <Skeleton width={48} height={48} borderRadius={16} />
                  <View style={styles.timelineSkeletonCol}>
                    <Skeleton width="85%" height={16} borderRadius={6} />
                    <Skeleton width="50%" height={13} borderRadius={6} style={{ marginTop: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : childMissing ? (
            <Text style={styles.unavailableHint}>No updates to show.</Text>
          ) : sortedDayReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyShapes} importantForAccessibility="no-hide-descendants">
                <View style={[styles.emptyShapeA, { backgroundColor: category.meal }]} />
                <View style={[styles.emptyShapeB, { backgroundColor: category.nap }]}>
                  <Ionicons name="create-outline" size={22} color={category.onCategory} />
                </View>
                <View style={[styles.emptyShapeC, { backgroundColor: category.attendance }]} />
              </View>
              <Text style={styles.emptyTitle}>No updates for this day</Text>
              <Text style={styles.emptyBody}>
                Log meals, naps, nappy changes, or activities so parents stay in the loop.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {sortedDayReports.map((item) => {
                const typeStyle = updateTypeStyle(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.timelineCard}
                    onPress={() =>
                      schoolId &&
                      navigation.navigate('ReportDetail', {
                        schoolId,
                        childId,
                        reportId: item.id,
                      })
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`View details: ${getTimelineTitle(item)}`}
                  >
                    <View style={[styles.timelineIconWrap, { backgroundColor: category[typeStyle.category] }]}>
                      <Ionicons name={typeStyle.icon} size={22} color={category.onCategory} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{getTimelineTitle(item)}</Text>
                      {item.notes ? (
                        <Text style={styles.timelineNotes} numberOfLines={2}>
                          {item.notes}
                        </Text>
                      ) : null}
                      <Text style={styles.timelineTime}>{formatTime(item.timestamp || item.createdAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={brand.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(brand: BrandPalette, category: CategoryPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    container: { flex: 1, backgroundColor: brand.background },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    profileAvatar: {
      width: 88,
      height: 88,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-4deg' }],
    },
    profileAvatarText: {
      fontFamily: brandFont.display800,
      fontSize: 34,
      letterSpacing: -1,
      color: category.onCategory,
    },
    profileTextCol: { flex: 1, minWidth: 0, gap: 6 },
    profileName: { ...typeTokens.nameL, color: category.onCategory },
    profileMeta: { fontFamily: brandFont.body700, fontSize: 14, color: '#33295A' },
    datePill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: brand.surface,
      borderRadius: radius.pill,
      padding: 4,
    },
    dateCenter: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    dateText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    datePickerDone: {
      alignSelf: 'flex-end',
      marginRight: spacing.screenX,
      marginTop: 8,
      minHeight: 44,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    datePickerDoneText: { fontFamily: brandFont.body800, fontSize: 16, color: brand.textPrimary },
    body: { padding: spacing.screenX, gap: spacing.gapM },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1 },
    sectionTitle: { ...typeTokens.section, color: brand.textPrimary, marginTop: 10, marginHorizontal: 4 },
    sectionTitleSkeleton: { marginTop: 10, marginHorizontal: 4 },
    grid: { gap: 12 },
    gridRow: { flexDirection: 'row', gap: 12 },
    unavailableHint: { ...typeTokens.body, color: brand.textSecondary, marginHorizontal: 4 },
    timelineList: { gap: 10 },
    timelineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      padding: 14,
    },
    timelineIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineSkeletonCol: { flex: 1, minWidth: 0 },
    timelineContent: { flex: 1, minWidth: 0, gap: 3 },
    timelineTitle: { fontFamily: brandFont.body800, fontSize: 15, color: brand.textPrimary },
    timelineNotes: { fontFamily: brandFont.body500, fontSize: 14, lineHeight: 20, color: brand.textSecondary },
    timelineTime: { fontFamily: brandFont.body700, fontSize: 13, color: brand.textTertiary },
    emptyCard: {
      backgroundColor: brand.surface,
      borderRadius: radius.card,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 10,
    },
    emptyShapes: { width: 120, height: 64, marginBottom: 6 },
    emptyShapeA: {
      position: 'absolute',
      left: 0,
      top: 8,
      width: 48,
      height: 48,
      borderRadius: 16,
      transform: [{ rotate: '-10deg' }],
    },
    emptyShapeB: {
      position: 'absolute',
      left: 36,
      top: 0,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyShapeC: {
      position: 'absolute',
      left: 72,
      top: 14,
      width: 44,
      height: 44,
      borderRadius: 14,
      transform: [{ rotate: '12deg' }],
    },
    emptyTitle: { fontFamily: brandFont.display800, fontSize: 22, letterSpacing: -0.44, color: brand.textPrimary, textAlign: 'center' },
    emptyBody: { ...typeTokens.body, color: brand.textSecondary, textAlign: 'center', maxWidth: 280 },
  });
}
