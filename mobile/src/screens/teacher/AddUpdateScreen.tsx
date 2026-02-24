import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { takePhotoAsync, pickPhotoAsync } from '../../utils/photoPicker';
import { uploadPhotoAsync } from '../../utils/uploadPhoto';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { MealOption } from '../../../../shared/types';
import type { ReportType } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type TeacherStackParamList = {
  TeacherHome: undefined;
  Reports: { childId: string };
  AddUpdate: { initialType?: ReportType; initialChildId?: string } | undefined;
  Announcements: undefined;
  Events: undefined;
  Settings: undefined;
};
type Props = NativeStackScreenProps<TeacherStackParamList, 'AddUpdate'>;

/** Per-child overrides for group variations (only set fields that differ from default) */
export type ChildFormOverrides = Partial<{
  mealType: 'breakfast' | 'lunch' | 'snack';
  mealAmount: string;
  mealOptionId: string | null;
  mealOptionName: string;
  nappyType: string;
  nappyCondition: string;
  napStartTime: string;
  napEndTime: string;
  sleepQuality: string;
  activityType: string | null;
  activityTitle: string;
  activityDescription: string;
  notes: string;
  photoCategory: string | null;
}>;

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast' },
  { value: 'lunch' as const, label: 'Lunch' },
  { value: 'snack' as const, label: 'Snack' },
];
const MEAL_AMOUNTS = [
  { value: 'none', label: 'None' },
  { value: 'some', label: 'Some' },
  { value: 'most', label: 'Most of it' },
  { value: 'all', label: 'All of it' },
];

const ACTIVITY_TABS = [
  { type: 'meal' as ReportType, label: 'Meal', icon: 'restaurant' as const },
  { type: 'nap_time' as ReportType, label: 'Nap', icon: 'bed' as const },
  { type: 'nappy_change' as ReportType, label: 'Nappy', icon: 'water' as const },
  { type: 'medication' as ReportType, label: 'Activity', icon: 'sparkles' as const },
  { type: 'incident' as ReportType, label: 'Photo', icon: 'camera' as const },
];

const NAPPY_TYPES = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'both', label: 'Both' },
];
const NAPPY_CONDITIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'rash', label: 'Rash' },
  { value: 'irritated', label: 'Irritated' },
];

const SLEEP_QUALITY_OPTIONS = [
  { value: 'excellent', label: 'Excellent - Slept soundly' },
  { value: 'good', label: 'Good - Fell asleep easily' },
  { value: 'fair', label: 'Fair - Took time to settle' },
  { value: 'poor', label: 'Poor - Restless sleep' },
  { value: 'none', label: 'Did not sleep' },
];

const ACTIVITY_TYPES = [
  'Art & Crafts',
  'Music & Movement',
  'Outdoor Play',
  'Reading & Story Time',
  'Science & Discovery',
  'Dramatic Play',
  'Sensory Play',
  'Other',
];

const PHOTO_CATEGORIES = [
  'Meals',
  'Outdoor Play',
  'Art Projects',
  'With Friends',
  'Other',
];

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `0:${String(seconds).padStart(2, '0')}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}:${String(s).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

export function AddUpdateScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  /** Per-child variations (only children with different values from default) */
  const [childOverrides, setChildOverrides] = useState<Record<string, ChildFormOverrides>>({});
  const [variationModalChildId, setVariationModalChildId] = useState<string | null>(null);
  const [variationDropdown, setVariationDropdown] = useState<string | null>(null);
  /** Draft form values when editing a child's variation (full effective values for that child) */
  const [variationDraft, setVariationDraft] = useState<ChildFormOverrides | null>(null);
  const [type, setType] = useState<ReportType>(
    route.params?.initialType ?? 'meal'
  );

  // When navigating from quick actions with initialType, switch to that tab
  useEffect(() => {
    const initial = route.params?.initialType;
    if (initial) setType(initial);
  }, [route.params?.initialType]);

  // When navigating from Daily report with initialChildId, pre-select that child
  useEffect(() => {
    const id = route.params?.initialChildId;
    if (id && children.some((c) => c.id === id)) setSelectedChildIds([id]);
  }, [route.params?.initialChildId, children]);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'snack'>('lunch');
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);
  const [selectedMealOptionId, setSelectedMealOptionId] = useState<string | null>(null);
  const [mealAmount, setMealAmount] = useState('most');
  const [notes, setNotes] = useState('');
  const [mealTime, setMealTime] = useState(() => formatTime(new Date()));
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState<string | null>(null);
  const [nappyTime, setNappyTime] = useState(() => formatTime(new Date()));
  const [nappyType, setNappyType] = useState('wet');
  const [nappyCondition, setNappyCondition] = useState('normal');
  const [napStartTime, setNapStartTime] = useState(() => formatTime(new Date()));
  const [napEndTime, setNapEndTime] = useState(() => formatTime(new Date()));
  const [napTimerStart, setNapTimerStart] = useState<number | null>(null);
  const [napTimerEnd, setNapTimerEnd] = useState<number | null>(null);
  const [napElapsedSeconds, setNapElapsedSeconds] = useState(0);
  const [sleepQuality, setSleepQuality] = useState('good');
  const [activityType, setActivityType] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityTime, setActivityTime] = useState(() => formatTime(new Date()));
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) return;

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      if (cancelled) return;
      const myClasses = classesSnap.docs.filter(
        (d) => (d.data() as ClassRoom).assignedTeacherId === uid
      );
      const classIds = myClasses.map((d) => d.id).slice(0, 10);

      if (classIds.length === 0) {
        setChildren([]);
        return;
      }

      unsub = onSnapshot(
        query(
          collection(db, 'schools', schoolId, 'children'),
          where('classId', 'in', classIds)
        ),
        (snap) => {
          if (cancelled) return;
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
          setChildren(list);
          if (list.length > 0 && selectedChildIds.length === 0) setSelectedChildIds([list[0].id]);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid]);

  // Keep read-only start time display in sync with current time
  useEffect(() => {
    const tick = () => {
      const t = formatTime(new Date());
      setMealTime(t);
      setNappyTime(t);
      setActivityTime(t);
      setNapStartTime((prev) => (napTimerStart != null ? prev : t));
      setNapEndTime((prev) => (napTimerEnd != null ? prev : t));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [napTimerStart, napTimerEnd]);

  // Nap timer: update elapsed seconds every second while running
  useEffect(() => {
    if (napTimerStart == null || napTimerEnd != null) return;
    const id = setInterval(() => {
      setNapElapsedSeconds(Math.floor((Date.now() - napTimerStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [napTimerStart, napTimerEnd]);

  // Load meal options (principal-defined) for teacher to select when logging meals
  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId) return;
    const unsub = onSnapshot(
      collection(db, 'schools', schoolId, 'mealOptions'),
      (snap) => {
        setMealOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealOption)));
      }
    );
    return () => unsub();
  }, [profile?.schoolId]);

  const mealOptionsForCategory = mealOptions.filter((o) => o.category === mealType);
  const selectedMealOption = mealOptions.find((o) => o.id === selectedMealOptionId);

  const selectedChildren = children.filter((c) => selectedChildIds.includes(c.id));

  const toggleChildSelection = (childId: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
    if (selectedChildIds.includes(childId)) {
      clearOverrideForChild(childId);
    }
  };

  const selectAllChildren = () => setSelectedChildIds(children.map((c) => c.id));
  const clearChildSelection = () => setSelectedChildIds([]);

  /** Get effective form values for a child (defaults + any overrides for this child) */
  const getValuesForChild = (childId: string) => {
    const o = childOverrides[childId] ?? {};
    return {
      mealType: (o.mealType ?? mealType) as 'breakfast' | 'lunch' | 'snack',
      mealAmount: o.mealAmount ?? mealAmount,
      mealOptionId: o.mealOptionId !== undefined ? o.mealOptionId : selectedMealOptionId,
      mealOptionName: o.mealOptionName ?? selectedMealOption?.name,
      nappyType: o.nappyType ?? nappyType,
      nappyCondition: o.nappyCondition ?? nappyCondition,
      napStartTime: o.napStartTime ?? napStartTime,
      napEndTime: o.napEndTime ?? napEndTime,
      sleepQuality: o.sleepQuality ?? sleepQuality,
      activityType: o.activityType !== undefined ? o.activityType : activityType,
      activityTitle: (o.activityTitle ?? activityTitle).trim(),
      activityDescription: (o.activityDescription ?? activityDescription).trim(),
      notes: (o.notes ?? notes).trim(),
      photoCategory: o.photoCategory !== undefined ? o.photoCategory : photoCategory,
    };
  };

  const setOverrideForChild = (childId: string, overrides: ChildFormOverrides) => {
    setChildOverrides((prev) => ({ ...prev, [childId]: overrides }));
  };
  const clearOverrideForChild = (childId: string) => {
    setChildOverrides((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });
  };

  const openVariationModal = (childId: string) => {
    setVariationModalChildId(childId);
    const v = getValuesForChild(childId);
    setVariationDraft({
      mealType: v.mealType,
      mealAmount: v.mealAmount,
      mealOptionId: v.mealOptionId,
      mealOptionName: v.mealOptionName ?? '',
      nappyType: v.nappyType,
      nappyCondition: v.nappyCondition,
      napStartTime: v.napStartTime,
      napEndTime: v.napEndTime,
      sleepQuality: v.sleepQuality,
      activityType: v.activityType,
      activityTitle: v.activityTitle,
      activityDescription: v.activityDescription,
      notes: v.notes,
      photoCategory: v.photoCategory,
    });
  };

  const saveVariation = () => {
    if (variationModalChildId && variationDraft) {
      setChildOverrides((prev) => ({ ...prev, [variationModalChildId]: variationDraft }));
    }
    setVariationModalChildId(null);
    setVariationDropdown(null);
    setVariationDraft(null);
  };

  const submit = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId || selectedChildIds.length === 0) {
      Alert.alert('Select children', 'Choose at least one child.');
      return;
    }
    if (type === 'incident' && !photoUri) {
      Alert.alert('Add a photo', 'Take or choose a photo to log.');
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      let uploadedImageUrl: string | null = null;
      if (type === 'incident' && photoUri && selectedChildIds.length > 0) {
        uploadedImageUrl = await uploadPhotoAsync(photoUri, schoolId, selectedChildIds[0]);
      }
      for (const childId of selectedChildIds) {
        const v = getValuesForChild(childId);
        const payload: Record<string, unknown> = {
          childId,
          schoolId,
          type,
          reportedBy: profile!.uid,
          notes: v.notes || undefined,
          timestamp: now.toISOString(),
          createdAt: now.toISOString(),
        };
        if (type === 'meal') {
          payload.mealType = v.mealType;
          payload.mealAmount = v.mealAmount;
          if (v.mealOptionId && v.mealOptionName) {
            payload.mealOptionId = v.mealOptionId;
            payload.mealOptionName = v.mealOptionName;
          }
        }
        if (type === 'nappy_change') {
          payload.nappyType = v.nappyType;
          payload.nappyCondition = v.nappyCondition;
        }
        if (type === 'nap_time') {
          payload.napStartTime = v.napStartTime;
          payload.napEndTime = v.napEndTime;
          payload.sleepQuality = v.sleepQuality;
        }
        if (type === 'medication') {
          payload.activityType = v.activityType || undefined;
          payload.activityTitle = v.activityTitle || undefined;
          payload.medicationName = v.activityType || undefined;
          if (v.activityDescription) payload.notes = v.activityDescription;
        }
        if (type === 'incident') {
          if (uploadedImageUrl) payload.imageUrl = uploadedImageUrl;
          if (v.photoCategory) payload.photoCategory = v.photoCategory;
        }
        const sanitized = Object.fromEntries(
          Object.entries(payload).filter(([, v]) => v !== undefined)
        ) as Record<string, unknown>;
        await addDoc(
          collection(db, 'schools', schoolId, 'children', childId, 'reports'),
          sanitized
        );
      }
      Alert.alert('Done', selectedChildIds.length > 1 ? `Update saved for ${selectedChildIds.length} children.` : 'Update saved.');
      setNotes('');
      setPhotoUri(null);
      setPhotoCategory(null);
      setChildOverrides({});
      setVariationModalChildId(null);
      if (type === 'nap_time') {
        setNapTimerStart(null);
        setNapTimerEnd(null);
        setNapElapsedSeconds(0);
      }
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const result = await takePhotoAsync();
    if (result) setPhotoUri(result.uri);
  };

  const handlePickPhoto = async () => {
    const result = await pickPhotoAsync();
    if (result) setPhotoUri(result.uri);
  };

  const startNapTimer = () => {
    const now = new Date();
    setNapStartTime(formatTime(now));
    setNapTimerStart(now.getTime());
    setNapTimerEnd(null);
    setNapElapsedSeconds(0);
  };

  const endNapTimer = () => {
    const now = new Date();
    setNapEndTime(formatTime(now));
    setNapTimerEnd(napTimerStart != null ? Date.now() : null);
    if (napTimerStart != null) {
      setNapElapsedSeconds(Math.floor((Date.now() - napTimerStart) / 1000));
    }
  };

  const napDurationSeconds =
    napTimerStart == null
      ? 0
      : napTimerEnd != null
        ? Math.floor((napTimerEnd - napTimerStart) / 1000)
        : napElapsedSeconds;
  const napTimerRunning = napTimerStart != null && napTimerEnd == null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Select children card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select children</Text>
        <TouchableOpacity
          style={styles.dropdownRow}
          onPress={() => children.length > 0 && setChildPickerOpen(true)}
          disabled={children.length === 0}
        >
          <Text style={[styles.dropdownText, selectedChildIds.length === 0 && styles.dropdownPlaceholder]}>
            {selectedChildIds.length === 0
              ? 'Select children for this activity'
              : selectedChildIds.length === 1
                ? selectedChildren[0]?.name ?? '1 child'
                : `${selectedChildIds.length} children selected`}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        {selectedChildren.length > 0 && (
          <View style={styles.selectedChildrenWrap}>
            <View style={styles.selectedChildrenActions}>
              <TouchableOpacity onPress={selectAllChildren} style={styles.selectedChildrenActionBtn}>
                <Text style={styles.selectedChildrenActionText}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearChildSelection} style={styles.selectedChildrenActionBtn}>
                <Text style={styles.selectedChildrenActionText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectedChildrenChips}>
              {selectedChildren.map((c) => (
                <View key={c.id} style={[styles.selectedChildChip, childOverrides[c.id] && styles.selectedChildChipVariation]}>
                  <Text style={styles.selectedChildChipText}>{c.name}</Text>
                  {selectedChildren.length > 1 && (
                    <TouchableOpacity
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => openVariationModal(c.id)}
                      style={styles.selectedChildChipVariationBtn}
                    >
                      <Ionicons
                        name={childOverrides[c.id] ? 'create' : 'create-outline'}
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => toggleChildSelection(c.id)}
                    style={styles.selectedChildChipRemove}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Activity type tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {ACTIVITY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.type}
              style={[styles.tab, type === tab.type && styles.tabActive]}
              onPress={() => setType(tab.type)}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={type === tab.type ? '#6366f1' : '#94a3b8'}
              />
              <Text style={[styles.tabLabel, type === tab.type && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedChildren.length > 0 && (
        <>
          <View style={styles.timeNoteWrap}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.timeNote}>
              Start time is not editable; current time is used when you save.
            </Text>
          </View>

          {type === 'meal' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Meal</Text>

              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.optionsRow}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.optionChip, mealType === m.value && styles.optionChipActive]}
                    onPress={() => {
                      setMealType(m.value);
                      setSelectedMealOptionId(null);
                    }}
                  >
                    <Text style={[styles.optionChipText, mealType === m.value && styles.optionChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Select meal (optional)</Text>
              {mealOptionsForCategory.length === 0 ? (
                <Text style={styles.helperText}>
                  No options defined for {mealType}. Principal can add options in Meal options.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealOptionsScroll}>
                  {mealOptionsForCategory.map((opt: MealOption) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.mealOptionCard,
                        selectedMealOptionId === opt.id && styles.mealOptionCardActive,
                      ]}
                      onPress={() => setSelectedMealOptionId(selectedMealOptionId === opt.id ? null : opt.id)}
                    >
                      {opt.imageUrl ? (
                        <Image source={{ uri: opt.imageUrl }} style={styles.mealOptionImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.mealOptionImage, styles.mealOptionImagePlaceholder]}>
                          <Ionicons name="restaurant-outline" size={24} color="#94a3b8" />
                        </View>
                      )}
                      <Text style={styles.mealOptionName} numberOfLines={2}>{opt.name}</Text>
                      {opt.description ? (
                        <Text style={styles.mealOptionDesc} numberOfLines={1}>{opt.description}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any extra details"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                editable={!loading}
              />

              <Text style={styles.label}>How much did they eat?</Text>
              <View style={styles.optionsRow}>
                {MEAL_AMOUNTS.map((a) => (
                  <TouchableOpacity
                    key={a.value}
                    style={[styles.optionChip, mealAmount === a.value && styles.optionChipActive]}
                    onPress={() => setMealAmount(a.value)}
                  >
                    <Text style={[styles.optionChipText, mealAmount === a.value && styles.optionChipTextActive]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={mealTime}
                placeholder="12:00"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color={colors.primaryContrast} style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Log Meal'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'incident' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Upload Photo</Text>
              <Text style={styles.photoZoneLabel}>Photo</Text>
              <TouchableOpacity
                style={[styles.photoUploadZone, photoUri ? styles.photoUploadZoneFilled : null]}
                onPress={async () => {
                  if (photoUri) return;
                  Alert.alert('Add Photo', 'Take a new photo or choose from library.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Take Photo', onPress: handleTakePhoto },
                    { text: 'Choose from Library', onPress: handlePickPhoto },
                  ]);
                }}
                disabled={loading}
              >
                {photoUri ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewInZone} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setPhotoUri(null);
                      }}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={28} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={48} color="#94a3b8" />
                    <Text style={styles.photoUploadHint}>Click to upload or drag and drop</Text>
                    <Text style={styles.photoUploadFormats}>PNG, JPG up to 10MB</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.previewRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.previewBtn}>
                  <Text style={styles.previewBtnText}>Preview</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Caption</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Describe what's happening in the photo..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                editable={!loading}
              />
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'photoCategory' ? null : 'photoCategory')}
              >
                <Text style={[styles.dropdownText, !photoCategory && styles.dropdownPlaceholder]}>
                  {photoCategory || 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {dropdownOpen === 'photoCategory' && (
                <View style={styles.dropdownOptions}>
                  {PHOTO_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setPhotoCategory(c);
                        setDropdownOpen(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primaryContrast} style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Uploading…' : 'Upload Photo'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'nappy_change' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Nappy Change</Text>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={nappyTime}
                placeholder="14:48"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
              <Text style={styles.label}>Type</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'nappyType' ? null : 'nappyType')}
              >
                <Text style={styles.dropdownText}>
                  {NAPPY_TYPES.find((n) => n.value === nappyType)?.label ?? 'Wet'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {dropdownOpen === 'nappyType' && (
                <View style={styles.dropdownOptions}>
                  {NAPPY_TYPES.map((n) => (
                    <TouchableOpacity
                      key={n.value}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setNappyType(n.value);
                        setDropdownOpen(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{n.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Condition</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'nappyCondition' ? null : 'nappyCondition')}
              >
                <Text style={styles.dropdownText}>
                  {NAPPY_CONDITIONS.find((c) => c.value === nappyCondition)?.label ?? 'Normal'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {dropdownOpen === 'nappyCondition' && (
                <View style={styles.dropdownOptions}>
                  {NAPPY_CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setNappyCondition(c.value);
                        setDropdownOpen(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional observations about the nappy change..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color={colors.primaryContrast} style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Log Nappy Change'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'nap_time' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Nap Time</Text>

              {/* Timer design */}
              <View style={styles.napTimerWrap}>
                <View style={[styles.napTimerCircle, napTimerRunning && styles.napTimerCircleActive]}>
                  <Ionicons
                    name="moon-outline"
                    size={32}
                    color={napTimerRunning ? colors.primary : colors.textMuted}
                    style={styles.napTimerIcon}
                  />
                  <Text style={[styles.napTimerDuration, napTimerRunning && styles.napTimerDurationActive]}>
                    {formatDuration(napDurationSeconds)}
                  </Text>
                  <Text style={styles.napTimerLabel}>
                    {napTimerStart == null
                      ? 'Tap Start when child falls asleep'
                      : napTimerEnd == null
                        ? 'Nap in progress…'
                        : 'Duration'}
                  </Text>
                </View>
                <View style={styles.napTimerButtons}>
                  {napTimerStart == null ? (
                    <TouchableOpacity
                      style={[styles.napTimerBtn, styles.napTimerBtnStart]}
                      onPress={startNapTimer}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={24} color="#fff" />
                      <Text style={styles.napTimerBtnStartText}>Start nap</Text>
                    </TouchableOpacity>
                  ) : napTimerEnd == null ? (
                    <TouchableOpacity
                      style={[styles.napTimerBtn, styles.napTimerBtnEnd]}
                      onPress={endNapTimer}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="stop" size={24} color="#fff" />
                      <Text style={styles.napTimerBtnEndText}>End nap</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.napTimerSummary}>
                      <Text style={styles.napTimerSummaryText}>
                        Started {napStartTime} · Ended {napEndTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={napStartTime}
                placeholder="13:00"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={napEndTime}
                placeholder="14:30"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
              <Text style={styles.label}>Sleep Quality</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'sleepQuality' ? null : 'sleepQuality')}
              >
                <Text style={styles.dropdownText}>
                  {SLEEP_QUALITY_OPTIONS.find((s) => s.value === sleepQuality)?.label ?? 'Good - Fell asleep easily'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {dropdownOpen === 'sleepQuality' && (
                <View style={styles.dropdownOptions}>
                  {SLEEP_QUALITY_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSleepQuality(s.value);
                        setDropdownOpen(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional observations..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color={colors.primaryContrast} style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Log Nap'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'medication' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Activity</Text>
              <Text style={styles.label}>Activity Type</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'activityType' ? null : 'activityType')}
              >
                <Text style={[styles.dropdownText, !activityType && styles.dropdownPlaceholder]}>
                  {activityType || 'Select activity type'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {dropdownOpen === 'activityType' && (
                <View style={styles.dropdownOptions}>
                  {ACTIVITY_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setActivityType(t);
                        setDropdownOpen(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Activity Title</Text>
              <TextInput
                style={styles.input}
                value={activityTitle}
                onChangeText={setActivityTitle}
                placeholder="e.g., Watercolor Painting"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={activityDescription}
                onChangeText={setActivityDescription}
                placeholder="Describe what the child did and how they engaged..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
              <Text style={styles.label}>Time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput, styles.inputReadOnly]}
                  value={activityTime}
                  placeholder="10:30"
                  placeholderTextColor={colors.textMuted}
                  editable={false}
                />
                <TouchableOpacity style={styles.previewBtn}>
                  <Text style={styles.previewBtnText}>Preview</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color={colors.primaryContrast} style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Add Activity'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {children.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No children assigned to your class.</Text>
        </View>
      )}

      {/* Variation modal: different values for one child */}
      <Modal
        visible={variationModalChildId != null}
        transparent
        animationType="slide"
        onRequestClose={() => { setVariationModalChildId(null); setVariationDropdown(null); setVariationDraft(null); }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => { setVariationModalChildId(null); setVariationDropdown(null); setVariationDraft(null); }}
        >
          <View style={[styles.modalContent, styles.variationModalContent]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              Variation for {variationModalChildId ? selectedChildren.find((c) => c.id === variationModalChildId)?.name : ''}
            </Text>
            <Text style={styles.variationModalHint}>Set different values for this child. Leave as default to match the main form.</Text>
            {variationDraft && (
              <ScrollView style={styles.variationModalScroll} keyboardShouldPersistTaps="handled">
                {type === 'meal' && (
                  <>
                    <Text style={styles.label}>How much did they eat?</Text>
                    <View style={styles.optionsRow}>
                      {MEAL_AMOUNTS.map((a) => (
                        <TouchableOpacity
                          key={a.value}
                          style={[styles.optionChip, variationDraft.mealAmount === a.value && styles.optionChipActive]}
                          onPress={() => setVariationDraft((p) => (p ? { ...p, mealAmount: a.value } : null))}
                        >
                          <Text style={[styles.optionChipText, variationDraft.mealAmount === a.value && styles.optionChipTextActive]}>{a.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                {type === 'nappy_change' && (
                  <>
                    <Text style={styles.label}>Type</Text>
                    <View style={styles.optionsRow}>
                      {NAPPY_TYPES.map((n) => (
                        <TouchableOpacity
                          key={n.value}
                          style={[styles.optionChip, variationDraft.nappyType === n.value && styles.optionChipActive]}
                          onPress={() => setVariationDraft((p) => (p ? { ...p, nappyType: n.value } : null))}
                        >
                          <Text style={[styles.optionChipText, variationDraft.nappyType === n.value && styles.optionChipTextActive]}>{n.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.label}>Condition</Text>
                    <View style={styles.optionsRow}>
                      {NAPPY_CONDITIONS.map((c) => (
                        <TouchableOpacity
                          key={c.value}
                          style={[styles.optionChip, variationDraft.nappyCondition === c.value && styles.optionChipActive]}
                          onPress={() => setVariationDraft((p) => (p ? { ...p, nappyCondition: c.value } : null))}
                        >
                          <Text style={[styles.optionChipText, variationDraft.nappyCondition === c.value && styles.optionChipTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                {(type === 'nap_time' || type === 'medication' || type === 'meal' || type === 'nappy_change' || type === 'incident') && (
                  <>
                    <Text style={styles.label}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      value={variationDraft.notes ?? ''}
                      onChangeText={(text) => setVariationDraft((p) => (p ? { ...p, notes: text } : null))}
                      placeholder="Different notes for this child..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                    />
                  </>
                )}
                {type === 'nap_time' && (
                  <>
                    <Text style={styles.label}>Sleep quality</Text>
                    <TouchableOpacity
                      style={styles.dropdownRow}
                      onPress={() => setVariationDropdown(variationDropdown === 'sleepQuality' ? null : 'sleepQuality')}
                    >
                      <Text style={styles.dropdownText}>
                        {SLEEP_QUALITY_OPTIONS.find((s) => s.value === variationDraft.sleepQuality)?.label ?? 'Good'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    {variationDropdown === 'sleepQuality' && (
                      <View style={styles.dropdownOptions}>
                        {SLEEP_QUALITY_OPTIONS.map((s) => (
                          <TouchableOpacity
                            key={s.value}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setVariationDraft((p) => (p ? { ...p, sleepQuality: s.value } : null));
                              setVariationDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownOptionText}>{s.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
                {type === 'medication' && (
                  <>
                    <Text style={styles.label}>Activity title</Text>
                    <TextInput
                      style={styles.input}
                      value={variationDraft.activityTitle ?? ''}
                      onChangeText={(text) => setVariationDraft((p) => (p ? { ...p, activityTitle: text } : null))}
                      placeholder="e.g., Watercolor Painting"
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                )}
                {type === 'incident' && (
                  <>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                      style={styles.dropdownRow}
                      onPress={() => setVariationDropdown(variationDropdown === 'photoCategory' ? null : 'photoCategory')}
                    >
                      <Text style={[styles.dropdownText, !variationDraft.photoCategory && styles.dropdownPlaceholder]}>
                        {variationDraft.photoCategory || 'Select category'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    {variationDropdown === 'photoCategory' && (
                      <View style={styles.dropdownOptions}>
                        {PHOTO_CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setVariationDraft((p) => (p ? { ...p, photoCategory: cat } : null));
                              setVariationDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownOptionText}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}
            <View style={styles.variationModalActions}>
              {variationModalChildId && childOverrides[variationModalChildId] && (
                <TouchableOpacity style={styles.variationModalClearBtn} onPress={() => { clearOverrideForChild(variationModalChildId); setVariationModalChildId(null); setVariationDropdown(null); setVariationDraft(null); }}>
                  <Text style={styles.variationModalClearText}>Clear variation</Text>
                </TouchableOpacity>
              )}
              <View style={styles.variationModalPrimaryActions}>
                <TouchableOpacity style={styles.modalDoneBtn} onPress={saveVariation}>
                  <Text style={styles.modalDoneBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.variationModalCancelBtn} onPress={() => { setVariationModalChildId(null); setVariationDropdown(null); setVariationDraft(null); }}>
                  <Text style={styles.variationModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Child picker modal */}
      <Modal
        visible={childPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChildPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChildPickerOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select children</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAllChildren} style={styles.modalActionBtn}>
                <Text style={styles.modalActionBtnText}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearChildSelection} style={styles.modalActionBtn}>
                <Text style={styles.modalActionBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {children.map((c) => {
                const isSelected = selectedChildIds.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                    onPress={() => toggleChildSelection(c.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalCheckbox, isSelected && styles.modalCheckboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={styles.modalOptionText}>{c.name}</Text>
                      <Text style={styles.modalOptionAge}>{getAge(c.dateOfBirth)} old</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setChildPickerOpen(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    content: { padding: 16, paddingBottom: 40 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSubtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, marginBottom: 24 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 },

    dropdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    dropdownText: { flex: 1, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    dropdownPlaceholder: { color: colors.textMuted },
    presentTag: {
      backgroundColor: colors.success,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    presentTagText: { fontSize: 12, fontWeight: '600', color: colors.primaryContrast },

    selectedChildrenWrap: { marginTop: 12 },
    selectedChildrenActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    selectedChildrenActionBtn: { paddingVertical: 4, paddingHorizontal: 0 },
    selectedChildrenActionText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    selectedChildrenChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selectedChildChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingVertical: 6,
      paddingLeft: 10,
      paddingRight: 4,
      borderRadius: 20,
      gap: 4,
    },
    selectedChildChipText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    selectedChildChipRemove: { padding: 2 },
    selectedChildChipVariation: { borderWidth: 1, borderColor: colors.primary },
    selectedChildChipVariationBtn: { padding: 2 },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryContrast },
    selectedChildInfo: { flex: 1 },
    selectedChildName: { fontSize: 16, fontWeight: '700', color: colors.text },
    selectedChildAge: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

    tabsWrapper: { marginBottom: 16 },
    tabsScroll: { gap: 8, paddingVertical: 4 },
    tab: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      minWidth: 80,
    },
    tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
    tabLabelActive: { color: colors.primary },

    label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 12 },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    optionChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    optionChipText: { fontSize: 14, color: colors.textMuted },
    optionChipTextActive: { color: colors.primary, fontWeight: '600' },

    helperText: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
    timeNoteWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
    },
    timeNote: { fontSize: 13, color: colors.textMuted, flex: 1 },
    inputReadOnly: { backgroundColor: colors.backgroundSecondary, color: colors.textMuted },

    napTimerWrap: { marginBottom: 20 },
    napTimerCircle: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 3,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    napTimerCircleActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    napTimerIcon: { marginBottom: 4 },
    napTimerDuration: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textMuted,
    },
    napTimerDurationActive: { color: colors.primary },
    napTimerLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    napTimerButtons: { marginTop: 20, alignItems: 'center' },
    napTimerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
      minWidth: 160,
    },
    napTimerBtnStart: { backgroundColor: colors.primary },
    napTimerBtnStartText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    napTimerBtnEnd: { backgroundColor: colors.warning },
    napTimerBtnEndText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    napTimerSummary: { paddingVertical: 8, paddingHorizontal: 16 },
    napTimerSummaryText: { fontSize: 14, color: colors.textMuted },
    mealOptionsScroll: { marginBottom: 8, marginHorizontal: -16 },
    mealOptionCard: {
      width: 120,
      marginRight: 10,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    mealOptionCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    mealOptionImage: { width: '100%', height: 72 },
    mealOptionImagePlaceholder: {
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealOptionName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, padding: 6 },
    mealOptionDesc: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 6, paddingBottom: 6 },

    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 14,
      fontSize: 15,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
    previewBtn: { alignSelf: 'flex-start', marginTop: 8 },
    previewBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 10,
      marginTop: 20,
    },
    primaryButtonIcon: { marginRight: 8 },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.primaryContrast },

    photoZoneLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
    photoUploadZone: {
      minHeight: 160,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    photoUploadZoneFilled: { padding: 0, minHeight: 0 },
    photoUploadHint: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
    photoUploadFormats: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    photoPreviewWrap: { position: 'relative', width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' },
    photoPreviewInZone: { width: '100%', height: '100%', backgroundColor: colors.backgroundSecondary },
    removePhotoBtn: { position: 'absolute', top: 8, right: 8 },
    dropdownOptions: { marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, maxHeight: 200 },
    dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.backgroundSecondary },
    dropdownOptionText: { fontSize: 15, color: colors.textSecondary },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    timeInput: { flex: 1 },

    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 15, color: colors.textMuted, marginTop: 12 },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    modalActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    modalActionBtn: { paddingVertical: 6, paddingHorizontal: 12 },
    modalActionBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    modalScroll: { maxHeight: 320 },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundSecondary,
      gap: 12,
    },
    modalOptionSelected: { backgroundColor: colors.primaryMuted },
    modalCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCheckboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalOptionTextWrap: { flex: 1 },
    modalOptionText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    modalOptionAge: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    modalDoneBtn: {
      marginTop: 16,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    modalDoneBtnText: { fontSize: 16, fontWeight: '700', color: colors.primaryContrast },

    variationModalContent: { maxHeight: '80%' },
    variationModalHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    variationModalScroll: { maxHeight: 280 },
    variationModalActions: { marginTop: 16, gap: 10 },
    variationModalClearBtn: { paddingVertical: 10, alignItems: 'center' },
    variationModalClearText: { fontSize: 14, color: colors.danger, fontWeight: '600' },
    variationModalPrimaryActions: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    variationModalCancelBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, backgroundColor: colors.backgroundSecondary },
    variationModalCancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  });
}
