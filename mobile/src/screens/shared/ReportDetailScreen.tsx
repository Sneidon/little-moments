import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { formatTime } from '../../utils';
import { getReportTitle, type ReportWithExtras } from '../../utils/childDailyReportDisplay';
import { formatMealAmount } from '../../utils/reportLabels';
import type { ColorPalette } from '../../theme/colors';

function formatNappyType(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v : undefined;
  if (!s) return undefined;
  const map: Record<string, string> = { wet: 'Wet', dry: 'Dry', dirty: 'Dry', normal: 'Normal' };
  return map[s] ?? s;
}

function formatNappyCondition(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v : undefined;
  if (!s) return undefined;
  const map: Record<string, string> = {
    normal: 'Normal',
    rash: 'Rash',
    irritated: 'Irritated',
  };
  return map[s] ?? s;
}

function formatSleepQuality(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v : undefined;
  if (!s) return undefined;
  const map: Record<string, string> = {
    excellent: 'Excellent — slept soundly',
    good: 'Good — fell asleep easily',
    fair: 'Fair — took time to settle',
    poor: 'Poor — restless sleep',
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

type ReportDetailParams = { schoolId: string; childId: string; reportId: string };
type Props = NativeStackScreenProps<{ ReportDetail: ReportDetailParams }, 'ReportDetail'>;

type ReportDoc = Record<string, unknown>;

function toIso(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v || undefined;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function typeLabel(type: string): string {
  switch (type) {
    case 'meal':
      return 'Meal';
    case 'nap_time':
      return 'Nap';
    case 'nappy_change':
      return 'Nappy change';
    case 'check_in':
      return 'Check in';
    case 'check_out':
      return 'Check out';
    case 'activity':
      return 'Activity';
    case 'class_change':
      return 'Class update';
    case 'child_joined_class':
      return 'Joined class';
    case 'medication':
      return 'Medication';
    case 'incident':
      return 'Photo / moment';
    default:
      return type.replace(/_/g, ' ');
  }
}

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'meal':
      return 'restaurant-outline';
    case 'nap_time':
      return 'moon-outline';
    case 'nappy_change':
      return 'water-outline';
    case 'check_in':
      return 'log-in-outline';
    case 'check_out':
      return 'log-out-outline';
    case 'activity':
      return 'sparkles-outline';
    case 'class_change':
      return 'school-outline';
    case 'child_joined_class':
      return 'person-add-outline';
    case 'medication':
      return 'medical-outline';
    case 'incident':
      return 'camera-outline';
    default:
      return 'document-text-outline';
  }
}

const TYPE_COLORS: Record<string, string> = {
  meal: '#ea580c',
  nap_time: '#7c3aed',
  nappy_change: '#0d9488',
  check_in: '#16a34a',
  check_out: '#b45309',
  activity: '#ea580c',
  class_change: '#6A4BB1',
  child_joined_class: '#16a34a',
  medication: '#2563eb',
  incident: '#db2777',
};

export function ReportDetailScreen({ route }: Props) {
  const { schoolId, childId, reportId } = route.params;
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [data, setData] = useState<ReportDoc | null>(null);
  const [childDisplayName, setChildDisplayName] = useState<string | null>(null);
  const [reporterDisplayName, setReporterDisplayName] = useState<string | null>(null);
  const [photoBoxWidth, setPhotoBoxWidth] = useState(0);
  const [photoIntrinsic, setPhotoIntrinsic] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChildDisplayName(null);
    setReporterDisplayName(null);
    (async () => {
      try {
        const reportRef = doc(db, 'schools', schoolId, 'children', childId, 'reports', reportId);
        const childRef = doc(db, 'schools', schoolId, 'children', childId);
        const [reportSnap, childSnap] = await Promise.all([getDoc(reportRef), getDoc(childRef)]);
        if (cancelled) return;
        if (!reportSnap.exists()) {
          setMissing(true);
          return;
        }
        const docData = { id: reportSnap.id, ...reportSnap.data() } as ReportDoc;
        setData(docData);

        if (childSnap.exists()) {
          const c = childSnap.data() as { preferredName?: string; name?: string };
          const nm = (c.preferredName?.trim() || c.name?.trim() || '') || null;
          if (!cancelled) setChildDisplayName(nm);
        }

        const rb = str(docData.reportedBy);
        if (rb) {
          try {
            const userSnap = await getDoc(doc(db, 'users', rb));
            if (!cancelled && userSnap.exists()) {
              const u = userSnap.data() as { displayName?: string };
              const dn = u.displayName?.trim();
              if (dn) setReporterDisplayName(dn);
            }
          } catch {
            /* ignore missing reporter profile */
          }
        }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, childId, reportId]);

  useEffect(() => {
    // Metric: time to first photo view (once per parent).
    if (!data) return;
    if (profile?.role !== 'parent') return;
    if ((profile as any).parentStatus !== 'ACTIVE') return;
    const imageUrl = str((data as any).imageUrl);
    if (!imageUrl) return;
    try {
      const fn = httpsCallable(getFunctions(app), 'recordFirstPhotoViewed');
      fn({ schoolId, childId, reportId }).catch(() => {});
    } catch {
      // ignore
    }
  }, [data, profile?.role, (profile as any)?.parentStatus, schoolId, childId, reportId]);

  const type = str(data?.type) ?? 'update';
  const accent = TYPE_COLORS[type] ?? colors.primary;
  const ts = toIso(data?.timestamp) || toIso(data?.createdAt);
  const cardTitle = data ? getReportTitle(data as unknown as ReportWithExtras) : typeLabel(type);

  const rows: { label: string; value: string }[] = [];
  if (ts) {
    rows.push({
      label: 'Time logged',
      value: `${formatTime(ts)} · ${new Date(ts).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`,
    });
  }
  if (childDisplayName) {
    rows.push({ label: 'Child', value: childDisplayName });
  }
  if (reporterDisplayName) {
    rows.push({ label: 'Logged by', value: reporterDisplayName });
  }
  if (type === 'meal') {
    const mt = str(data?.mealType);
    if (mt) rows.push({ label: 'Meal', value: mt.charAt(0).toUpperCase() + mt.slice(1) });
    const opt = str(data?.mealOptionName);
    if (opt) rows.push({ label: 'Option', value: opt });
    const amt = formatMealAmount(data?.mealAmount);
    if (amt) rows.push({ label: 'Amount eaten', value: amt });
  }
  if (type === 'nappy_change') {
    const nt = formatNappyType(data?.nappyType);
    if (nt) rows.push({ label: 'Type', value: nt });
    const nc = formatNappyCondition(data?.nappyCondition);
    if (nc) rows.push({ label: 'Condition', value: nc });
  }
  if (type === 'nap_time') {
    const start = str(data?.napStartTime);
    const end = str(data?.napEndTime);
    if (start) rows.push({ label: 'Nap start', value: start });
    if (end) rows.push({ label: 'Nap end', value: end });
    const mins = data?.napDurationMinutes;
    if (typeof mins === 'number' && mins > 0) {
      rows.push({
        label: 'Duration',
        value: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`,
      });
    }
    const sq = formatSleepQuality(data?.sleepQuality);
    if (sq) rows.push({ label: 'Sleep quality', value: sq });
  }
  if (type === 'activity') {
    const actType = str(data?.activityType);
    if (actType) rows.push({ label: 'Activity type', value: actType });
    const titleText = str(data?.activityTitle);
    if (titleText) rows.push({ label: 'Title', value: titleText });
  }
  if (type === 'medication') {
    const medName = str(data?.medicationName);
    if (medName) rows.push({ label: 'Medication', value: medName });
    const d = str(data?.medicationDosage);
    if (d) rows.push({ label: 'Dosage', value: d });
  }
  if (type === 'incident') {
    const cat = str(data?.photoCategory);
    if (cat) rows.push({ label: 'Category', value: cat });
    const det = str(data?.incidentDetails);
    if (det) rows.push({ label: 'Details', value: det });
    const fc = data?.forWholeClass;
    if (fc === true) rows.push({ label: 'Shared with', value: 'Whole class' });
    else if (fc === false) rows.push({ label: 'Shared with', value: 'This child’s family' });
  }
  const notes = str(data?.notes);
  if (notes) rows.push({ label: 'Notes', value: notes });

  const imageUrl = str(data?.imageUrl);
  const mediaType = str(data?.mediaType);
  const isVideo = mediaType?.toLowerCase().includes('video');

  useEffect(() => {
    setPhotoIntrinsic(null);
  }, [imageUrl]);

  const photoDisplayHeight = useMemo(() => {
    if (!photoIntrinsic || photoBoxWidth <= 0) return null;
    const { w: iw, h: ih } = photoIntrinsic;
    if (iw <= 0 || ih <= 0) return null;
    const raw = (photoBoxWidth * ih) / iw;
    return Math.round(Math.min(Math.max(raw, 160), 560));
  }, [photoIntrinsic, photoBoxWidth]);

  const onPhotoLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPhotoBoxWidth(w);
  }, []);

  const onPhotoLoad = useCallback((e: { nativeEvent: { source: { width: number; height: number } } }) => {
    const { width: w, height: h } = e.nativeEvent.source;
    if (w > 0 && h > 0) setPhotoIntrinsic({ w, h });
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading update…</Text>
      </View>
    );
  }

  if (missing || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Update not found</Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
          This entry may have been removed.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.heroIcon, { backgroundColor: accent + '22' }]}>
          <Ionicons name={typeIcon(type)} size={32} color={accent} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{cardTitle}</Text>
        <Text style={[styles.heroType, { color: colors.textMuted }]}>{typeLabel(type)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Details</Text>
        {rows.map((row, i) => (
          <View
            key={`${row.label}-${i}`}
            style={[styles.row, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
          >
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{row.value}</Text>
          </View>
        ))}
        {rows.length === 0 && !imageUrl ? (
          <Text style={[styles.emptyDetail, { color: colors.textMuted }]}>No extra details.</Text>
        ) : null}
      </View>

      {imageUrl ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            {isVideo ? 'Media' : 'Photo'}
          </Text>
          {isVideo ? (
            <TouchableOpacity
              style={[styles.videoBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => Linking.openURL(imageUrl)}
            >
              <Ionicons name="play-circle" size={40} color={colors.primary} />
              <Text style={[styles.videoBtnText, { color: colors.primary }]}>Open video</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.photoWrap, { backgroundColor: colors.backgroundSecondary }]} onLayout={onPhotoLayout}>
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.photo,
                  photoDisplayHeight != null ? { height: photoDisplayHeight } : styles.photoSizing,
                ]}
                resizeMode="contain"
                onLoad={onPhotoLoad}
              />
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontFamily: font.regular, fontSize: 15 },
    errorTitle: { fontFamily: font.semiBold, fontSize: 18, marginTop: 16 },
    errorSub: { fontFamily: font.regular, fontSize: 14, marginTop: 8, textAlign: 'center' },
    hero: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 16,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    heroTitle: { fontFamily: font.bold, fontSize: 22, textAlign: 'center' },
    heroType: { fontFamily: font.regular, fontSize: 14, marginTop: 6 },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: {
      fontFamily: font.semiBold,
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    row: { paddingVertical: 12 },
    rowLabel: { fontFamily: font.medium, fontSize: 13, marginBottom: 4 },
    rowValue: { fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
    emptyDetail: { fontFamily: font.regular, fontSize: 15, paddingVertical: 8 },
    photoWrap: {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
    },
    photo: {
      width: '100%',
    },
    photoSizing: {
      minHeight: 200,
      maxHeight: 360,
    },
    videoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 20,
      borderRadius: 12,
    },
    videoBtnText: { fontFamily: font.semiBold, fontSize: 16 },
  });
}
