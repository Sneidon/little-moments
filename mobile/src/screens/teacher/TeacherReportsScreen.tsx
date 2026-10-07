import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useOpenChat, NO_PARENTS_ALERT } from '../../hooks';
import { PrimaryButton, OutlineButton } from '../../components/brand/Buttons';
import { DailyReportView, useChildDailyReport, useRefreshPulse } from '../../features/daily-report';
import type { RootStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export function TeacherReportsScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const schoolId = useAuth().profile?.schoolId;
  const report = useChildDailyReport(schoolId, childId);
  const { openChat, openingChildId } = useOpenChat();
  const { refreshing, onRefresh } = useRefreshPulse();

  if (!schoolId) return null;

  const unavailable = report.childLoading || report.childMissing;

  return (
    <DailyReportView
      audience="teacher"
      {...report}
      missingMessage="This student may have been removed."
      emptySubtitle="Log meals, naps, nappy changes, or activities so parents stay in the loop."
      refreshing={refreshing}
      onRefresh={onRefresh}
      onBack={() => navigation.goBack()}
      onPressItem={(item) => navigation.navigate('ReportDetail', { schoolId, childId, reportId: item.id })}
      actions={
        <>
          <PrimaryButton
            label="Add update"
            icon="add"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('AddUpdate', { initialChildId: childId })}
            disabled={unavailable}
          />
          <OutlineButton
            label="Message parents"
            icon="chatbubble-outline"
            style={{ flex: 1 }}
            disabled={unavailable || !report.child?.parentIds?.length}
            loading={openingChildId === childId}
            onPress={() =>
              openChat({ schoolId, childId, otherParticipantId: report.child?.parentIds?.[0], ...NO_PARENTS_ALERT })
            }
          />
        </>
      }
    />
  );
}
