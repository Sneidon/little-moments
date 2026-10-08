import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOpenChat, NO_TEACHER_ALERT } from '../../hooks';
import { PrimaryButton, OutlineButton } from '../../components/brand/Buttons';
import {
  DailyReportView,
  useChildDailyReport,
  useMealOptionImages,
  useRefreshPulse,
} from '../../features/daily-report';
import { resolveReportImageUrl } from '../../utils/childDailyReportDisplay';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildProfile'>;

export function ParentChildProfileScreen({ route, navigation }: Props) {
  const { childId, schoolId } = route.params;
  const report = useChildDailyReport(schoolId, childId);
  const mealImages = useMealOptionImages(schoolId);
  const { openChat, openingChildId } = useOpenChat();
  const { refreshing, onRefresh } = useRefreshPulse();

  return (
    <DailyReportView
      audience="parent"
      {...report}
      missingMessage="This profile may have been removed."
      emptySubtitle="When teachers log meals, naps, or activities, they will show up here."
      refreshing={refreshing}
      onRefresh={onRefresh}
      onBack={() => navigation.goBack()}
      onPressItem={(item) => navigation.navigate('ReportDetail', { schoolId, childId, reportId: item.id })}
      imageFor={(item) => resolveReportImageUrl(item, mealImages)}
      actions={
        <>
          <OutlineButton
            label="Message teacher"
            icon="chatbubble-outline"
            style={{ flex: 1 }}
            disabled={!report.teacherId}
            loading={openingChildId === childId}
            onPress={() => openChat({ schoolId, childId, otherParticipantId: report.teacherId, ...NO_TEACHER_ALERT })}
          />
          <PrimaryButton
            label="Announcements"
            icon="megaphone-outline"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('ParentAnnouncements')}
          />
        </>
      }
    />
  );
}
