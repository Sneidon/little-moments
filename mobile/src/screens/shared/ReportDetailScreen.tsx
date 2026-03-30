import React, { useEffect, useMemo, useState } from 'react';
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
import { db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { font } from '../../theme/typography';
import { formatTime } from '../../utils';
import type { ColorPalette } from '../../theme/colors';

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
  medication: '#2563eb',
  incident: '#db2777',
};

export function ReportDetailScreen({ route }: Props) {
  const { schoolId, childId, reportId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [data, setData] = useState<ReportDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, 'schools', schoolId, 'children', childId, 'reports', reportId);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (!snap.exists()) {
          setMissing(true);
          return;
        }
        setData({ id: snap.id, ...snap.data() } as ReportDoc);
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

  const type = str(data?.type) ?? 'update';
  const accent = TYPE_COLORS[type] ?? colors.primary;
  const ts = toIso(data?.timestamp) || toIso(data?.createdAt);
  const title = typeLabel(type);

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
  if (type === 'meal') {
    const mt = str(data?.mealType);
    if (mt) rows.push({ label: 'Meal', value: mt.charAt(0).toUpperCase() + mt.slice(1) });
    const opt = str(data?.mealOptionName);
    if (opt) rows.push({ label: 'Option', value: opt });
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
  }
  if (type === 'medication') {
    const n = str(data?.medicationName);
    if (n) rows.push({ label: 'Medication', value: n });
    const d = str(data?.medicationDosage);
    if (d) rows.push({ label: 'Dosage', value: d });
    const at = str(data?.activityTitle);
    if (at) rows.push({ label: 'Activity', value: at });
  }
  if (type === 'incident') {
    const det = str(data?.incidentDetails);
    if (det) rows.push({ label: 'Details', value: det });
    const fc = data?.forWholeClass;
    if (fc === true) rows.push({ label: 'Shared with', value: 'Whole class' });
  }
  const notes = str(data?.notes);
  if (notes) rows.push({ label: 'Notes', value: notes });

  const imageUrl = str(data?.imageUrl);
  const mediaType = str(data?.mediaType);
  const isVideo = mediaType?.toLowerCase().includes('video');

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
        <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
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
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
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
    photo: {
      width: '100%',
      minHeight: 200,
      maxHeight: 360,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
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
