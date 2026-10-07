import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getReportTitle, type ReportWithExtras } from '../../utils/childDailyReportDisplay';
import {
  ReportDetailsCard,
  ReportHero,
  ReportMediaCard,
  buildDetailRows,
  str,
  useRecordFirstPhotoView,
  useReportDetail,
  useReportDetailStyles,
} from '../../features/report-detail';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportDetail'>;

export function ReportDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useReportDetailStyles();
  const { loading, missing, data, imageUrl, childName, reporterName } = useReportDetail(
    route.params.schoolId,
    route.params.childId,
    route.params.reportId
  );
  useRecordFirstPhotoView(route.params, data ? imageUrl : undefined);
  const rows = useMemo(() => (data ? buildDetailRows(data, childName, reporterName) : []), [data, childName, reporterName]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading update…</Text>
      </View>
    );
  }

  if (missing || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorTitle}>Update not found</Text>
        <Text style={styles.errorSub}>This entry may have been removed.</Text>
      </View>
    );
  }

  const isVideo = !!str(data.mediaType)?.toLowerCase().includes('video');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <ReportHero type={str(data.type) ?? 'update'} title={getReportTitle(data as unknown as ReportWithExtras)} />
      <ReportDetailsCard rows={rows} hasMedia={!!imageUrl} />
      {imageUrl ? <ReportMediaCard uri={imageUrl} isVideo={isVideo} /> : null}
    </ScrollView>
  );
}
