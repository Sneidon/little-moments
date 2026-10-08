import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { EmptyCard } from '../../components/brand/EmptyCard';
import { MediaBlock } from '../../components/brand/MediaBlock';
import { Skeleton } from '../../components/Skeleton';
import { radius, spacing } from '../../theme/tokens';
import { getReportTitle, type ReportWithExtras } from '../../utils/childDailyReportDisplay';
import {
  DetailCard,
  NotesCard,
  ReportHero,
  SectionTitle,
  buildReportDetail,
  str,
  useRecordFirstPhotoView,
  useReportDetail,
} from '../../features/report-detail';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportDetail'>;

export function ReportDetailScreen({ route }: Props) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { loading, missing, data, imageUrl, childName, reporterName } = useReportDetail(
    route.params.schoolId,
    route.params.childId,
    route.params.reportId
  );
  useRecordFirstPhotoView(route.params, data ? imageUrl : undefined);
  const detail = useMemo(() => (data ? buildReportDetail(data, childName, reporterName) : null), [data, childName, reporterName]);
  const content = [styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }];

  if (loading) {
    return (
      <View style={[styles.screen, ...content]} accessibilityState={{ busy: true }}>
        <Skeleton height={190} borderRadius={radius.cardL} />
        <Skeleton height={140} borderRadius={radius.card} />
        <Skeleton height={110} borderRadius={radius.card} />
      </View>
    );
  }

  if (missing || !data || !detail) {
    return (
      <View style={[styles.screen, ...content]}>
        <EmptyCard icon="alert-circle-outline" title="Update not found" body="This entry may have been removed." />
      </View>
    );
  }

  const mediaType = str(data.mediaType);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={content} showsVerticalScrollIndicator={false}>
      <ReportHero
        type={str(data.type) ?? 'update'}
        title={getReportTitle(data as unknown as ReportWithExtras)}
        time={detail.time}
        date={detail.date}
      />
      {imageUrl ? <MediaBlock url={imageUrl} mediaType={mediaType} /> : null}
      {detail.details.length ? (
        <>
          <SectionTitle>Details</SectionTitle>
          <DetailCard rows={detail.details} />
        </>
      ) : null}
      {detail.notes ? (
        <>
          <SectionTitle>Notes</SectionTitle>
          <NotesCard notes={detail.notes} />
        </>
      ) : null}
      {detail.people.length ? (
        <>
          <SectionTitle>Who</SectionTitle>
          <DetailCard rows={detail.people} people />
        </>
      ) : null}
    </ScrollView>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.background },
    content: { padding: spacing.screenX, gap: spacing.gapM },
  });
