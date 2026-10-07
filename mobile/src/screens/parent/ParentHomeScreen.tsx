import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '../../context/ThemeContext';
import { useDateNavigation } from '../../hooks/useDateNavigation';
import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';
import { NO_TEACHER_ALERT, useOpenChat } from '../../hooks/useOpenChat';
import { useMealOptionImages } from '../../features/daily-report/useMealOptionImages';
import type { RootStackParamList } from '../../navigation/types';
import { ChildChips, ChildSummaryCard } from './home/ChildSummary';
import { AnnouncementsCta, MessageTeacherButton } from './home/HomeActions';
import { HomeOverview } from './home/HomeOverview';
import { HomeUpdates } from './home/HomeUpdates';
import { useOnboardingTour } from './home/useOnboardingTour';
import { useParentHomeData } from './home/useParentHomeData';

export function ParentHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { colors } = useTheme();
  const dateNav = useDateNavigation();
  const { children, selectedChild, selectedChildId, setSelectedChildId, className, reports, refreshing, onRefresh } =
    useParentHomeData(dateNav.selectedDate);
  const mealImages = useMealOptionImages(selectedChild?.schoolId);
  const { openChat, openingChildId } = useOpenChat();
  useNotificationNavigation(true);
  useOnboardingTour();

  const topPadding = headerHeight > 0 ? 8 : Math.max(insets.top + 8, 12);
  const childRef = selectedChild ? { childId: selectedChild.id, schoolId: selectedChild.schoolId } : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPadding, paddingBottom: 8 }}>
        <ChildSummaryCard
          child={selectedChild}
          className={className}
          onPress={() => childRef && navigation.navigate('ChildProfile', childRef)}
        />
        <ChildChips children={children} selectedId={selectedChildId} onSelect={setSelectedChildId} />
        <AnnouncementsCta onPress={() => navigation.navigate('ParentAnnouncements')} />
      </View>

      <HomeOverview reports={reports} dateNav={dateNav} />

      {selectedChild?.assignedTeacherId ? (
        <MessageTeacherButton
          loading={openingChildId === selectedChild.id}
          onPress={() =>
            openChat({
              schoolId: selectedChild.schoolId,
              childId: selectedChild.id,
              otherParticipantId: selectedChild.assignedTeacherId,
              ...NO_TEACHER_ALERT,
            })
          }
        />
      ) : null}

      <HomeUpdates
        title={dateNav.isToday ? "Today's updates" : 'Updates'}
        reports={reports}
        mealImages={mealImages}
        onOpen={childRef ? (reportId) => navigation.navigate('ReportDetail', { ...childRef, reportId }) : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 48, flexGrow: 1 },
});
