import React, { useEffect, useState, useMemo, useLayoutEffect, useRef } from 'react';
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
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { takePhotoAsync, pickPhotoAsync, pickMediaAsync, showMediaSourceAlert } from '../../utils/photoPicker';
import { uploadPhotoAsync, uploadMediaAsync } from '../../utils/uploadPhoto';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { MealOption } from '../../../../shared/types';
import type { ReportType } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { font } from '../../theme/typography';

type AddUpdateStackParamList = {
  AddUpdate: { initialType?: ReportType; initialChildId?: string } | undefined;
};
type Props = NativeStackScreenProps<AddUpdateStackParamList, 'AddUpdate'>;

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
  medicationDosage: string;
  notes: string;
  photoCategory: string | null;
}>;

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast' },
  { value: 'lunch' as const, label: 'Lunch' },
  { value: 'snack' as const, label: 'Snack' },
];
const MEAL_AMOUNTS = [
  { value: 'none', label: 'None', circleText: 'None' },
  { value: 'little', label: 'A little', circleText: 'Little' },
  { value: 'half', label: 'Half', circleText: 'Half' },
  { value: 'most', label: 'Most', circleText: 'Most' },
  { value: 'all', label: 'All', circleText: 'All' },
];

const ACTIVITY_TABS = [
  { type: 'meal' as ReportType, label: 'Meal', icon: 'restaurant' as const },
  { type: 'nap_time' as ReportType, label: 'Nap', icon: 'moon' as const },
  { type: 'nappy_change' as ReportType, label: 'Nappy', icon: 'water' as const },
  { type: 'medication' as ReportType, label: 'Activity', icon: 'color-palette' as const },
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childListModalOpen, setChildListModalOpen] = useState(false);
  const [childListSearch, setChildListSearch] = useState('');
  /** Only auto-pick a default child once; avoids clearing selection on every Firestore snapshot. */
  const didAutoSelectChildrenRef = useRef(false);
  /** True after we know class roster (even if empty). */
  const [classRosterLoaded, setClassRosterLoaded] = useState(false);
  const rosterSkelPulse = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    if (classRosterLoaded) {
      rosterSkelPulse.setValue(1);
      return undefined;
    }
    rosterSkelPulse.setValue(0.42);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rosterSkelPulse, {
          toValue: 0.92,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(rosterSkelPulse, {
          toValue: 0.38,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [classRosterLoaded, rosterSkelPulse]);
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
  const [mealAmount, setMealAmount] = useState('half');
  const [notes, setNotes] = useState('');
  const [mealTime, setMealTime] = useState(() => formatTime(new Date()));
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | undefined>(undefined);
  const [photoCategory, setPhotoCategory] = useState<string | null>(null);
  const [forWholeClass, setForWholeClass] = useState(false);
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
  const [medicationDosage, setMedicationDosage] = useState('');
  const [activityTime, setActivityTime] = useState(() => formatTime(new Date()));
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = profile?.schoolId;
    const uid = profile?.uid;
    if (!schoolId || !uid) {
      setChildren([]);
      setClassRosterLoaded(true);
      return;
    }

    setClassRosterLoaded(false);
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
        setClassRosterLoaded(true);
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
          setClassRosterLoaded(true);
          if (list.length > 0 && !didAutoSelectChildrenRef.current) {
            didAutoSelectChildrenRef.current = true;
            const initId = route.params?.initialChildId;
            if (initId && list.some((c) => c.id === initId)) setSelectedChildIds([initId]);
            else setSelectedChildIds([list[0].id]);
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      didAutoSelectChildrenRef.current = false;
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

  useEffect(() => {
    if (type !== 'meal') return;
    const opts = mealOptions.filter((o) => o.category === mealType);
    if (opts.length === 0) {
      setSelectedMealOptionId(null);
      return;
    }
    setSelectedMealOptionId((prev) => (prev && opts.some((o) => o.id === prev) ? prev : opts[0].id));
  }, [mealType, mealOptions, type]);

  const selectedChildren = children.filter((c) => selectedChildIds.includes(c.id));

  useLayoutEffect(() => {
    const sel = children.filter((c) => selectedChildIds.includes(c.id));
    const n = sel.length;
    const a11y =
      n === 0
        ? 'Add Update'
        : `Selected: ${sel.map((c) => c.name).join(', ')}`;

    const navAvatarSize = 28;
    const overlap = 9;
    const maxFaces = 3;

    navigation.setOptions({
      headerTitle: () => (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 200,
            alignSelf: 'center',
            minHeight: 36,
          }}
          accessibilityRole="header"
          accessibilityLabel={a11y}
        >
          {n === 0 ? (
            <Text
              style={{
                fontFamily: font.bold,
                fontSize: 17,
                color: colors.text,
                textAlign: 'center',
              }}
            >
              Add Update
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {sel.slice(0, maxFaces).map((c, i) => (
                <View
                  key={c.id}
                  style={{
                    width: navAvatarSize,
                    height: navAvatarSize,
                    borderRadius: navAvatarSize / 2,
                    backgroundColor: colors.avatarBg,
                    borderWidth: 2,
                    borderColor: colors.backgroundSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: i === 0 ? 0 : -overlap,
                    zIndex: maxFaces - i,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: font.bold,
                      color: colors.avatarText,
                    }}
                  >
                    {getInitials(c.name)}
                  </Text>
                </View>
              ))}
              {n > maxFaces ? (
                <View
                  style={{
                    width: navAvatarSize,
                    height: navAvatarSize,
                    borderRadius: navAvatarSize / 2,
                    backgroundColor: colors.primaryMuted,
                    borderWidth: 2,
                    borderColor: colors.backgroundSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: -overlap,
                    zIndex: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: font.bold,
                      color: colors.primary,
                    }}
                  >
                    +{n - maxFaces}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ),
      headerTitleAlign: 'center',
      headerTintColor: colors.text,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.backgroundSecondary },
      headerRight:
        classRosterLoaded && children.length > 0
          ? () => (
              <TouchableOpacity
                onPress={() => setChildListModalOpen(true)}
                style={{ paddingHorizontal: 10, paddingVertical: 8, marginRight: 4 }}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="Search class list"
                accessibilityRole="button"
              >
                <Ionicons name="search-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            )
          : () => null,
    });
  }, [
    navigation,
    colors.text,
    colors.backgroundSecondary,
    colors.avatarBg,
    colors.avatarText,
    colors.primary,
    colors.primaryMuted,
    selectedChildIds,
    children,
    classRosterLoaded,
    children,
  ]);

  const childrenFilteredForModal = useMemo(() => {
    const q = childListSearch.trim().toLowerCase();
    if (!q) return children;
    return children.filter((c) => c.name.toLowerCase().includes(q));
  }, [children, childListSearch]);

  useEffect(() => {
    if (!childListModalOpen) setChildListSearch('');
  }, [childListModalOpen]);

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
      medicationDosage: (o.medicationDosage ?? medicationDosage).trim(),
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
      medicationDosage: v.medicationDosage ?? '',
      notes: v.notes,
      photoCategory: v.photoCategory,
    });
  };

  const closeVariationModal = () => {
    setVariationModalChildId(null);
    setVariationDropdown(null);
    setVariationDraft(null);
  };

  /** Merge variation edits vs main form; drop override entry if nothing differs. */
  const saveVariation = () => {
    const id = variationModalChildId;
    const d = variationDraft;
    if (!id || !d) {
      closeVariationModal();
      return;
    }

    const next: ChildFormOverrides = { ...childOverrides[id] };

    const clearNotes = () => {
      delete next.notes;
    };
    if ((d.notes ?? '').trim() !== notes.trim()) next.notes = (d.notes ?? '').trim();
    else clearNotes();

    if (type === 'meal') {
      delete next.mealType;
      delete next.mealAmount;
      delete next.mealOptionId;
      delete next.mealOptionName;
      if (d.mealAmount !== mealAmount) next.mealAmount = d.mealAmount;
      if (d.mealType !== mealType) next.mealType = d.mealType;
      const mainOpt = selectedMealOptionId ?? null;
      const draftOpt = d.mealOptionId ?? null;
      if (draftOpt !== mainOpt) {
        next.mealOptionId = d.mealOptionId ?? null;
        if (d.mealOptionId && d.mealOptionName) next.mealOptionName = d.mealOptionName;
        else delete next.mealOptionName;
      }
    }
    if (type === 'nappy_change') {
      delete next.nappyType;
      delete next.nappyCondition;
      if (d.nappyType !== nappyType) next.nappyType = d.nappyType;
      if (d.nappyCondition !== nappyCondition) next.nappyCondition = d.nappyCondition;
    }
    if (type === 'nap_time') {
      delete next.sleepQuality;
      delete next.napStartTime;
      delete next.napEndTime;
      if (d.sleepQuality !== sleepQuality) next.sleepQuality = d.sleepQuality;
      if ((d.napStartTime ?? '') !== napStartTime) next.napStartTime = d.napStartTime;
      if ((d.napEndTime ?? '') !== napEndTime) next.napEndTime = d.napEndTime;
    }
    if (type === 'medication') {
      delete next.activityTitle;
      delete next.medicationDosage;
      if ((d.activityTitle ?? '').trim() !== activityTitle.trim()) next.activityTitle = (d.activityTitle ?? '').trim();
      if ((d.medicationDosage ?? '').trim() !== medicationDosage.trim())
        next.medicationDosage = (d.medicationDosage ?? '').trim();
    }
    if (type === 'incident') {
      delete next.photoCategory;
      const mainCat = photoCategory ?? null;
      const draftCat = d.photoCategory ?? null;
      if (draftCat !== mainCat) next.photoCategory = d.photoCategory ?? null;
    }

    const pruned: ChildFormOverrides = {};
    (Object.keys(next) as (keyof ChildFormOverrides)[]).forEach((k) => {
      const v = next[k];
      if (v === undefined) return;
      pruned[k] = v as never;
    });
    if (Object.keys(pruned).length === 0) clearOverrideForChild(id);
    else setChildOverrides((prev) => ({ ...prev, [id]: pruned }));

    closeVariationModal();
  };

  const submit = async () => {
    const schoolId = profile?.schoolId;
    const needSelection = type !== 'incident' || !forWholeClass;
    if (!schoolId || (needSelection && selectedChildIds.length === 0)) {
      Alert.alert('Select children', 'Choose at least one child.');
      return;
    }
    if (type === 'meal') {
      const opts = mealOptions.filter((o) => o.category === mealType);
      if (opts.length === 0) {
        Alert.alert(
          'No meals on menu',
          `There are no meals set up for ${mealType}. Ask your principal to add meal options for this meal type.`
        );
        return;
      }
      for (const childId of selectedChildIds) {
        const v = getValuesForChild(childId);
        if (!v.mealOptionId || !opts.some((o) => o.id === v.mealOptionId)) {
          Alert.alert(
            'Choose a meal',
            'Pick a meal from the list for each child. Tap a child’s name if they need a different menu item.'
          );
          return;
        }
      }
    }
    if (type === 'incident' && !photoUri) {
      Alert.alert('Add media', 'Take or choose a photo/video to log.');
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const targetChildIds = type === 'incident' && forWholeClass ? children.map((c) => c.id) : selectedChildIds;
      if (targetChildIds.length === 0) {
        Alert.alert('Select children', forWholeClass ? 'No children in your class.' : 'Choose at least one child.');
        setLoading(false);
        return;
      }
      let uploadedUrl: string | null = null;
      let mediaType: string | undefined;
      if (type === 'incident' && photoUri) {
        const isVideo = photoMimeType?.startsWith('video/');
        if (isVideo) {
          const { url, mediaType: mt } = await uploadMediaAsync(photoUri, schoolId, targetChildIds[0], photoMimeType);
          uploadedUrl = url;
          mediaType = mt;
        } else {
          uploadedUrl = await uploadPhotoAsync(photoUri, schoolId, targetChildIds[0]);
        }
      }
      for (const childId of targetChildIds) {
        const v = getValuesForChild(childId);
        const payload: Record<string, unknown> = {
          childId,
          schoolId,
          type,
          reportedBy: profile!.uid,
          timestamp: now.toISOString(),
          createdAt: now.toISOString(),
        };
        if (type !== 'meal') {
          payload.notes = v.notes || undefined;
        }
        if (type === 'meal') {
          payload.mealType = v.mealType;
          payload.mealAmount = v.mealAmount;
          const mealOpt = mealOptions.find((o) => o.id === v.mealOptionId);
          payload.mealOptionId = v.mealOptionId;
          payload.mealOptionName = mealOpt?.name ?? v.mealOptionName ?? '';
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
          payload.medicationName = v.activityTitle || undefined;
          payload.medicationDosage = v.medicationDosage?.trim() || undefined;
          if (v.activityDescription) payload.notes = v.activityDescription;
        }
        if (type === 'incident') {
          if (uploadedUrl) payload.imageUrl = uploadedUrl;
          if (mediaType) payload.mediaType = mediaType;
          if (forWholeClass) payload.forWholeClass = true;
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
      setPhotoMimeType(undefined);
      setPhotoCategory(null);
      setForWholeClass(false);
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
    if (result) {
      setPhotoUri(result.uri);
      setPhotoMimeType(undefined);
    }
  };

  const handlePickPhoto = async () => {
    const result = await pickPhotoAsync();
    if (result) {
      setPhotoUri(result.uri);
      setPhotoMimeType(undefined);
    }
  };

  const handlePickMedia = async () => {
    const result = await pickMediaAsync();
    if (result) {
      setPhotoUri(result.uri);
      setPhotoMimeType(result.mimeType);
    }
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

      <View style={styles.heroCard}>
        <View style={styles.heroBlock}>
          {!classRosterLoaded ? (
            <View style={styles.rosterLoadingWrap} accessibilityState={{ busy: true }}>
              <View style={styles.whoHeaderBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionAccentBar, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sectionEyebrow}>Who</Text>
                    <Text style={styles.sectionTitle}>Receives this update</Text>
                    <Text style={styles.selectionHint}>
                      Fetching your class roster. You can select children here in a moment.
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childrenRow}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={styles.childAvatarItem}>
                    <Animated.View
                      style={[
                        styles.childAvatarRing,
                        styles.rosterSkelRing,
                        { opacity: rosterSkelPulse },
                      ]}
                    >
                      <View style={[styles.childAvatarInner, styles.rosterSkelInnerFill]} />
                    </Animated.View>
                    <Animated.View
                      style={[styles.rosterSkelNameBar, styles.rosterSkelNameBarWide, { opacity: rosterSkelPulse }]}
                    />
                    <Animated.View
                      style={[styles.rosterSkelNameBar, styles.rosterSkelNameBarNarrow, { opacity: rosterSkelPulse }]}
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.childActionsRow}>
                <Animated.View style={[styles.rosterSkelActionPill, { opacity: rosterSkelPulse }]} />
                <Animated.View style={[styles.rosterSkelActionPillOutline, { opacity: rosterSkelPulse }]} />
              </View>
            </View>
          ) : children.length === 0 ? (
            <View style={styles.emptyChildrenWrap}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccentBar, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionEyebrow}>Who</Text>
                  <Text style={styles.sectionTitle}>Receives this update</Text>
                </View>
              </View>
              <View style={styles.emptyChildrenCard}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyChildrenTitle}>No children in your class</Text>
                <Text style={styles.emptyChildrenHint}>When children are enrolled in your assigned class, they’ll appear here.</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.whoHeaderBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionAccentBar, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sectionEyebrow}>Who</Text>
                    <Text style={styles.sectionTitle}>Receives this update</Text>
                    <Text style={styles.selectionHint}>
                      Tap a photo to select or deselect. Use the search icon (top right) to open the full class list.
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childrenRow}
              >
                {children.map((c) => {
                  const selected = selectedChildIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.childAvatarItem}
                      onPress={() => toggleChildSelection(c.id)}
                      activeOpacity={0.85}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${c.name}, ${selected ? 'selected' : 'not selected'}`}
                    >
                      <View
                        style={[
                          styles.childAvatarRing,
                          selected ? styles.childAvatarRingSelected : styles.childAvatarRingIdle,
                        ]}
                      >
                        <View
                          style={[
                            styles.childAvatarInner,
                            selected && styles.childAvatarInnerSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.childAvatarInitials,
                              selected && styles.childAvatarInitialsSelected,
                            ]}
                          >
                            {getInitials(c.name)}
                          </Text>
                        </View>
                        {selected ? (
                          <View style={styles.childAvatarCheck}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[styles.childAvatarName, selected && styles.childAvatarNameSelected]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {c.name.trim().split(/\s+/)[0] || c.name}
                      </Text>
                      {c.name.trim().includes(' ') ? (
                        <Text style={styles.childAvatarSurname} numberOfLines={1}>
                          {c.name.trim().slice(c.name.trim().indexOf(' ') + 1)}
                        </Text>
                      ) : (
                        <View style={styles.childAvatarNameSpacer} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {children.length > 5 ? (
                <Text style={styles.childrenScrollHint}>Swipe sideways for more children →</Text>
              ) : null}

              <View style={styles.childActionsRow}>
                <TouchableOpacity style={styles.childActionPill} onPress={selectAllChildren} activeOpacity={0.8}>
                  <Ionicons name="checkmark-done" size={18} color="#fff" style={styles.childActionPillIcon} />
                  <Text style={styles.childActionPillText}>All in class</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.childActionPillOutline} onPress={clearChildSelection} activeOpacity={0.8}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} style={styles.childActionPillIcon} />
                  <Text style={styles.childActionPillOutlineText}>Clear</Text>
                </TouchableOpacity>
              </View>

              {selectedChildren.length > 1 && (
                <>
                  <Text style={styles.variationSectionLabel}>Different details per child? Tap a name:</Text>
                  <View style={styles.variationChipsRow}>
                    {selectedChildren.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.variationChip, childOverrides[c.id] && styles.variationChipActive]}
                        onPress={() => openVariationModal(c.id)}
                      >
                        <Text style={styles.variationChipText} numberOfLines={1}>
                          {c.name.split(' ')[0]}
                        </Text>
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroBlock}>
          <View style={styles.whatHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionAccentBar, { backgroundColor: colors.accentTeal }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sectionEyebrow}>What</Text>
                <Text style={styles.sectionTitle}>Type of update</Text>
                <Text style={styles.whatTypeHint}>Pick what you’re logging. You can change it anytime.</Text>
              </View>
            </View>
            <View style={styles.whatTypeBadge}>
              <Text style={styles.whatTypeBadgeText} numberOfLines={1}>
                {ACTIVITY_TABS.find((t) => t.type === type)?.label ?? 'Meal'}
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityScroll}
          >
            {ACTIVITY_TABS.map((tab) => {
              const active = type === tab.type;
              return (
                <TouchableOpacity
                  key={tab.type}
                  style={styles.activityItem}
                  onPress={() => setType(tab.type)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.activityCircle, active && styles.activityCircleActive]}>
                    <Ionicons name={tab.icon} size={active ? 26 : 22} color={active ? '#fff' : colors.textSecondary} />
                  </View>
                  <Text style={[styles.activityLabel, active && styles.activityLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {classRosterLoaded && children.length > 0 && selectedChildren.length === 0 && (
        <View style={styles.needSelectionCard}>
          <View style={styles.needSelectionIconWrap}>
            <Ionicons name="hand-left-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.needSelectionTextWrap}>
            <Text style={styles.needSelectionTitle}>Who is this update for?</Text>
            <Text style={styles.needSelectionBody}>
              Tap photos above, use All in class, or tap the search icon at the top to pick from the full list.
            </Text>
          </View>
        </View>
      )}

      {selectedChildren.length > 0 && (
        <>
          <View style={styles.timeNoteBanner}>
            <View style={styles.timeNoteIconCircle}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.timeNoteTextWrap}>
              <Text style={styles.timeNoteTitle}>Times</Text>
              <Text style={styles.timeNote}>
                The time is recorded when you tap Post. You don’t need to set the clock here.
              </Text>
            </View>
          </View>

          {type === 'meal' && (
            <View style={[styles.screenCard, styles.formSection]}>
              <View style={styles.formSectionHead}>
                <Text style={styles.formSectionTitle}>Log meal</Text>
              </View>

              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.mealTypePill, mealType === m.value && styles.mealTypePillActive]}
                    onPress={() => setMealType(m.value)}
                  >
                    <Text style={[styles.mealTypePillText, mealType === m.value && styles.mealTypePillTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Choose meal (from school menu)</Text>
              {mealOptionsForCategory.length === 0 ? (
                <Text style={styles.helperText}>
                  No meals are on the menu for {mealType} yet. Your principal adds them in Meal options. Teachers pick
                  only from that list.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.mealOptionsScroll}
                  contentContainerStyle={styles.mealOptionsScrollContent}
                >
                  {mealOptionsForCategory.map((opt: MealOption) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.mealOptionCard,
                        selectedMealOptionId === opt.id && styles.mealOptionCardActive,
                      ]}
                      onPress={() => setSelectedMealOptionId(opt.id)}
                      activeOpacity={0.85}
                    >
                      {opt.imageUrl ? (
                        <Image source={{ uri: opt.imageUrl }} style={styles.mealOptionImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.mealOptionImage, styles.mealOptionImagePlaceholder]}>
                          <Ionicons name="restaurant-outline" size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={styles.mealOptionName} numberOfLines={2}>
                        {opt.name}
                      </Text>
                      {opt.description ? (
                        <Text style={styles.mealOptionDesc} numberOfLines={1}>
                          {opt.description}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.label}>How much did they eat?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.amountScroll}
              >
                {MEAL_AMOUNTS.map((a) => (
                  <TouchableOpacity
                    key={a.value}
                    style={styles.amountItem}
                    onPress={() => setMealAmount(a.value)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.amountCircle, mealAmount === a.value && styles.amountCircleActive]}>
                      <Text
                        style={[
                          styles.amountCircleText,
                          mealAmount === a.value && styles.amountCircleTextActive,
                        ]}
                        numberOfLines={2}
                      >
                        {a.circleText}
                      </Text>
                    </View>
                    <Text style={[styles.amountLabel, mealAmount === a.value && styles.amountLabelActive]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Time</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={mealTime}
                placeholder="12:00"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />

            </View>
          )}

          {type === 'incident' && (
            <View style={[styles.screenCard, styles.formSection]}>
              <View style={styles.formSectionHead}>
                <Text style={styles.formSectionTitle}>Add photo</Text>
              </View>
              <Text style={styles.photoZoneLabel}>Photo</Text>
              <TouchableOpacity
                style={[styles.photoUploadZone, photoUri ? styles.photoUploadZoneFilled : null]}
                onPress={() => {
                  if (photoUri) return;
                  showMediaSourceAlert(handleTakePhoto, handlePickPhoto, handlePickMedia);
                }}
                disabled={loading}
              >
                {photoUri ? (
                  <View style={styles.photoThumbWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoThumbImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setPhotoUri(null);
                        setPhotoMimeType(undefined);
                      }}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={28} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={48} color="#94a3b8" />
                    <Text style={styles.photoUploadHint}>Tap to add photo or video</Text>
                    <Text style={styles.photoUploadFormats}>Photos & videos</Text>
                  </>
                )}
              </TouchableOpacity>
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
                style={[styles.optionChip, forWholeClass && styles.optionChipActive, { marginTop: 12 }]}
                onPress={() => setForWholeClass((x) => !x)}
              >
                <Ionicons name={forWholeClass ? 'checkbox' : 'square-outline'} size={20} color={forWholeClass ? colors.primary : colors.textMuted} />
                <Text style={[styles.optionChipText, forWholeClass && styles.optionChipTextActive, { marginLeft: 8 }]}>
                  For whole class (notify all parents)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'nappy_change' && (
            <View style={[styles.screenCard, styles.formSection]}>
              <View style={styles.formSectionHead}>
                <Text style={styles.formSectionTitle}>Nappy change</Text>
              </View>
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
            </View>
          )}

          {type === 'nap_time' && (
            <View style={[styles.screenCard, styles.formSection]}>
              <View style={styles.formSectionHead}>
                <Text style={styles.formSectionTitle}>Nap time</Text>
              </View>

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
                        Started {napStartTime}, ended {napEndTime}
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
            </View>
          )}

          {type === 'medication' && (
            <View style={[styles.screenCard, styles.formSection]}>
              <View style={styles.formSectionHead}>
                <Text style={styles.formSectionTitle}>Activity</Text>
              </View>
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
              <Text style={styles.label}>Name of medication / activity</Text>
              <TextInput
                style={styles.input}
                value={activityTitle}
                onChangeText={setActivityTitle}
                placeholder="e.g. Paracetamol, Watercolor Painting"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
              <Text style={styles.label}>Dosage administered (optional)</Text>
              <TextInput
                style={styles.input}
                value={medicationDosage}
                onChangeText={setMedicationDosage}
                placeholder="e.g. 5ml, 1 tablet"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
              <Text style={styles.label}>Notes</Text>
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
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={activityTime}
                placeholder="10:30"
                placeholderTextColor={colors.textMuted}
                editable={false}
              />
            </View>
          )}

          <View style={styles.postUpdateWrap}>
            <TouchableOpacity
              style={styles.postUpdateBtn}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.92}
            >
              <Ionicons name="paper-plane" size={20} color="#FFFFFF" style={styles.postUpdateIcon} />
              <Text style={styles.postUpdateBtnText}>{loading ? 'Posting…' : 'Post update'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {children.length === 0 && (
        <View style={[styles.screenCard, styles.emptyState]}>
          <Ionicons name="people-outline" size={44} color={colors.primary} />
          <Text style={styles.emptyText}>No children assigned to your class.</Text>
          <Text style={styles.emptySubtext}>Ask your principal to assign your class.</Text>
        </View>
      )}

      {/* Variation modal: different values for one child */}
      <Modal
        visible={variationModalChildId != null}
        transparent
        animationType="fade"
        onRequestClose={closeVariationModal}
      >
        <KeyboardAvoidingView
          style={styles.variationModalKb}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
        >
          <View style={styles.variationModalRoot}>
            <Pressable
              style={styles.variationModalDimmer}
              onPress={closeVariationModal}
              accessibilityLabel="Dismiss"
              accessibilityRole="button"
            />
            <View style={styles.variationModalCard} pointerEvents="box-none">
              <View style={styles.variationModalCardInner}>
                <View style={styles.variationModalHeader}>
                  <View style={styles.variationModalHeaderText}>
                    <Text style={styles.variationModalEyebrow}>Different for</Text>
                    <Text style={styles.variationModalTitle} numberOfLines={2}>
                      {variationModalChildId
                        ? selectedChildren.find((c) => c.id === variationModalChildId)?.name ?? 'Child'
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.variationModalCloseBtn}
                    onPress={closeVariationModal}
                    hitSlop={12}
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={26} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.variationModalHint}>
                  Only fields you change here differ from the main form. Same as main = no variation.
                </Text>
                {variationDraft && (
                  <ScrollView
                    style={styles.variationModalScroll}
                    contentContainerStyle={styles.variationModalScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                {type === 'meal' && (
                  <>
                    <Text style={styles.label}>Meal from menu</Text>
                    {mealOptionsForCategory.length === 0 ? (
                      <Text style={styles.helperText}>No meals for {mealType}.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.variationMealOptionsScroll}
                        contentContainerStyle={styles.variationMealOptionsScrollContent}
                      >
                        {mealOptionsForCategory.map((opt: MealOption) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.mealOptionCard,
                              styles.variationMealOptionCard,
                              variationDraft.mealOptionId === opt.id && styles.mealOptionCardActive,
                            ]}
                            onPress={() =>
                              setVariationDraft((p) =>
                                p ? { ...p, mealOptionId: opt.id, mealOptionName: opt.name } : null
                              )
                            }
                          >
                            {opt.imageUrl ? (
                              <Image source={{ uri: opt.imageUrl }} style={styles.mealOptionImage} resizeMode="cover" />
                            ) : (
                              <View style={[styles.mealOptionImage, styles.mealOptionImagePlaceholder]}>
                                <Ionicons name="restaurant-outline" size={22} color={colors.textMuted} />
                              </View>
                            )}
                            <Text style={styles.mealOptionName} numberOfLines={2}>
                              {opt.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    <Text style={[styles.label, styles.labelTightTop]}>How much did they eat?</Text>
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
                {(type === 'nap_time' || type === 'medication' || type === 'nappy_change' || type === 'incident') && (
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
                    <Text style={styles.label}>Activity / medication name</Text>
                    <TextInput
                      style={styles.input}
                      value={variationDraft.activityTitle ?? ''}
                      onChangeText={(text) => setVariationDraft((p) => (p ? { ...p, activityTitle: text } : null))}
                      placeholder="e.g. Paracetamol, Watercolor Painting"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.label}>Dosage (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={variationDraft.medicationDosage ?? ''}
                      onChangeText={(text) => setVariationDraft((p) => (p ? { ...p, medicationDosage: text } : null))}
                      placeholder="e.g. 5ml, 1 tablet"
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
                    <TouchableOpacity
                      style={styles.variationModalClearBtn}
                      onPress={() => {
                        clearOverrideForChild(variationModalChildId);
                        closeVariationModal();
                      }}
                    >
                      <Text style={styles.variationModalClearText}>Reset to main form</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.variationModalPrimaryActions}>
                    <TouchableOpacity style={styles.variationModalSaveBtn} onPress={saveVariation} activeOpacity={0.85}>
                      <Text style={styles.variationModalSaveBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.variationModalCancelBtn} onPress={closeVariationModal}>
                      <Text style={styles.variationModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={childListModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChildListModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChildListModalOpen(false)}>
          <View style={[styles.modalContent, styles.childListModalContent]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Class list</Text>
            <Text style={styles.childListModalSubtitle}>Tap a row to toggle selection (same as the photos above).</Text>
            <View style={styles.childListSearchWrap}>
              <Ionicons name="search" size={20} color={colors.textMuted} style={styles.childListSearchIcon} />
              <TextInput
                style={styles.childListSearchInput}
                placeholder="Search by name…"
                placeholderTextColor={colors.textMuted}
                value={childListSearch}
                onChangeText={setChildListSearch}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {childListSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setChildListSearch('')} hitSlop={12}>
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.childListModalActions}>
              <TouchableOpacity onPress={selectAllChildren} style={styles.childListModalQuickBtn}>
                <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
                <Text style={styles.childListModalQuickBtnText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearChildSelection} style={styles.childListModalQuickBtn}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.childListModalQuickBtnText, styles.childListModalQuickBtnTextMuted]}>None</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.childListModalScroll} keyboardShouldPersistTaps="handled">
              {childrenFilteredForModal.length === 0 ? (
                <Text style={styles.childListEmptySearch}>No names match “{childListSearch.trim()}”</Text>
              ) : (
                childrenFilteredForModal.map((c) => {
                  const isSelected = selectedChildIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.childListRow, isSelected && styles.childListRowSelected]}
                      onPress={() => toggleChildSelection(c.id)}
                      activeOpacity={0.65}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <View
                        style={[
                          styles.childListRowAvatar,
                          isSelected && styles.childListRowAvatarSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.childListRowInitials,
                            isSelected && styles.childListRowInitialsSelected,
                          ]}
                        >
                          {getInitials(c.name)}
                        </Text>
                      </View>
                      <View style={styles.modalOptionTextWrap}>
                        <Text style={[styles.childListRowName, isSelected && styles.childListRowNameSelected]}>
                          {c.name}
                        </Text>
                        <Text style={styles.modalOptionAge}>{getAge(c.dateOfBirth)} old</Text>
                      </View>
                      <View style={[styles.modalCheckbox, isSelected && styles.modalCheckboxChecked]}>
                        {isSelected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setChildListModalOpen(false)}>
              <Text style={styles.modalDoneBtnText}>
                Done ({selectedChildIds.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Blocking save modal - prevents navigation while saving */}
      <Modal
        visible={loading}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.savingOverlay}>
          <View style={styles.savingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.savingText}>Saving…</Text>
            <Text style={styles.savingHint}>Please wait</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: import('../../theme/colors').ColorPalette, isDark: boolean) {
  const f = (weight: 'regular' | 'medium' | 'semiBold' | 'bold') => ({ fontFamily: font[weight] });
  const activityIdleBg = isDark ? '#252525' : '#F0F2F5';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSubtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, marginBottom: 24 },

    screenCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 14,
      ...(!isDark
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          }
        : {}),
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
      overflow: 'hidden',
      ...(!isDark
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.07,
            shadowRadius: 14,
            elevation: 4,
          }
        : {}),
    },
    heroBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 },
    heroDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 18,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    sectionAccentBar: {
      width: 4,
      height: 40,
      borderRadius: 2,
      marginRight: 12,
    },
    sectionEyebrow: {
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
      ...f('semiBold'),
    },
    sectionTitle: { fontSize: 18, color: colors.text, marginTop: 2, ...f('bold') },
    childActionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    childActionPill: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    childActionPillIcon: { marginRight: -2 },
    childActionPillText: { fontSize: 15, color: '#FFFFFF', ...f('semiBold') },
    childActionPillOutline: {
      flex: 1,
      flexDirection: 'row',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? 'transparent' : colors.backgroundSecondary,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    childActionPillOutlineText: { fontSize: 15, color: colors.text, ...f('semiBold') },
    rosterLoadingWrap: { width: '100%', paddingBottom: 4 },
    rosterSkelRing: {
      borderColor: colors.skeleton,
      backgroundColor: isDark ? 'transparent' : colors.skeletonHighlight,
    },
    rosterSkelInnerFill: {
      backgroundColor: colors.skeleton,
    },
    rosterSkelNameBar: {
      height: 11,
      borderRadius: 5,
      backgroundColor: colors.skeleton,
      alignSelf: 'center',
    },
    rosterSkelNameBarWide: { width: 52, marginTop: 10 },
    rosterSkelNameBarNarrow: { width: 36, marginTop: 5 },
    rosterSkelActionPill: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.skeleton,
    },
    rosterSkelActionPillOutline: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? 'transparent' : colors.backgroundSecondary,
    },
    whatHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 6,
    },
    whatTypeHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 19,
      ...f('medium'),
    },
    whatTypeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.accentTealSoft,
      maxWidth: 110,
      marginTop: 4,
    },
    whatTypeBadgeText: { fontSize: 13, color: colors.text, ...f('semiBold') },
    needSelectionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: 18,
      borderRadius: 18,
      marginBottom: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...(!isDark
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }
        : {}),
    },
    needSelectionIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    needSelectionTextWrap: { flex: 1, minWidth: 0 },
    needSelectionTitle: { fontSize: 17, color: colors.text, ...f('semiBold') },
    needSelectionBody: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      lineHeight: 21,
      ...f('medium'),
    },
    emptyChildrenWrap: { width: '100%' },
    emptyChildrenCard: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
      marginTop: 8,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyChildrenTitle: { fontSize: 17, color: colors.text, marginTop: 14, textAlign: 'center', ...f('semiBold') },
    emptyChildrenHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
      ...f('medium'),
    },
    whoHeaderBlock: { width: '100%', marginBottom: 14 },
    selectionHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 19,
      ...f('medium'),
    },
    variationSectionLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 14,
      marginBottom: 4,
      ...f('medium'),
    },
    activityScroll: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: 12,
      paddingRight: 12,
      paddingVertical: 6,
      alignItems: 'flex-start',
    },
    sectionLabel: {
      fontSize: 17,
      color: colors.text,
      marginBottom: 14,
      ...f('bold'),
    },
    childrenRow: { flexDirection: 'row', gap: 14, paddingRight: 16, paddingBottom: 8, paddingTop: 4 },
    childAvatarItem: { width: 80, alignItems: 'center' },
    childAvatarRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
    },
    childAvatarRingIdle: {
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? 'transparent' : 'rgba(0,0,0,0.02)',
    },
    childAvatarRingSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'transparent' : colors.primaryMuted,
    },
    childAvatarInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.avatarBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    childAvatarInnerSelected: {
      backgroundColor: isDark ? colors.avatarBg : colors.card,
    },
    childAvatarCheck: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: colors.card,
    },
    childAvatarInitials: { fontSize: 19, color: colors.avatarText, ...f('bold') },
    childAvatarInitialsSelected: { color: colors.primary },
    childAvatarName: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      maxWidth: 76,
      ...f('semiBold'),
    },
    childAvatarNameSelected: { color: colors.primary, ...f('bold') },
    childAvatarSurname: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 2,
      maxWidth: 76,
      ...f('medium'),
    },
    childAvatarNameSpacer: { height: 15 },
    childrenScrollHint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 2,
      ...f('medium'),
    },
    variationChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 0 },
    variationChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.primaryMuted,
      maxWidth: '48%',
    },
    variationChipActive: { borderWidth: 1, borderColor: colors.primary },
    variationChipText: { fontSize: 13, color: colors.text, flexShrink: 1, ...f('semiBold') },

    activityItem: { alignItems: 'center', minWidth: 72, paddingHorizontal: 2 },
    activityCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? activityIdleBg : colors.primaryMuted,
      borderWidth: 1.5,
      borderColor: isDark ? colors.cardBorder : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityCircleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      transform: [{ scale: 1.06 }],
      ...(!isDark
        ? {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }
        : {}),
    },
    activityLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 8, textAlign: 'center', ...f('semiBold') },
    activityLabelActive: { color: colors.primary, ...f('bold') },

    formSection: { marginBottom: 0 },
    formSectionHead: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 12,
      marginBottom: 16,
    },
    formSectionTitle: { fontSize: 19, color: colors.text, marginBottom: 0, marginTop: 0, ...f('bold') },
    mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    mealTypePill: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    mealTypePillActive: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.primaryMuted : colors.card,
    },
    mealTypePillText: { fontSize: 14, color: colors.textSecondary, ...f('semiBold') },
    mealTypePillTextActive: { color: colors.primary, ...f('bold') },
    amountScroll: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: 10,
      paddingVertical: 6,
      paddingRight: 8,
    },
    amountItem: { alignItems: 'center', minWidth: 62 },
    amountCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: activityIdleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountCircleActive: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.primaryMuted : colors.primaryMuted,
    },
    amountCircleText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      ...f('semiBold'),
      paddingHorizontal: 4,
    },
    amountCircleTextActive: { color: colors.primary, ...f('bold') },
    amountLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 6, textAlign: 'center', ...f('semiBold') },
    amountLabelActive: { color: colors.primary, ...f('bold') },

    postUpdateWrap: { marginTop: 8, marginBottom: 8 },
    postUpdateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.ctaPurple,
      paddingVertical: 17,
      borderRadius: 18,
      ...(!isDark
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          }
        : {}),
      elevation: 5,
    },
    postUpdateBtnText: { fontSize: 17, color: '#FFFFFF', ...f('bold') },
    postUpdateIcon: { marginTop: 1 },

    variationMealOptionsScroll: { marginBottom: 4, maxHeight: 200 },
    variationMealOptionsScrollContent: { paddingRight: 8, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
    variationMealOptionCard: { marginRight: 10, maxWidth: 108 },
    modalSecondaryBtn: { paddingVertical: 12, alignItems: 'center' },
    modalSecondaryBtnText: { fontSize: 15, color: colors.textMuted, ...f('medium') },

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
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.backgroundSecondary,
    },
    dropdownText: { flex: 1, fontSize: 15, color: colors.text, ...f('medium') },
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

    label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, marginTop: 14, ...f('semiBold') },
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

    helperText: { fontSize: 13, color: colors.textMuted, marginBottom: 8, lineHeight: 18, ...f('medium') },
    listViewLink: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginTop: 12,
    },
    listViewLinkText: { fontSize: 14, color: colors.primary, ...f('semiBold') },
    labelTightTop: { marginTop: 8 },
    timeNoteBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      backgroundColor: colors.primaryMuted,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.05)',
    },
    timeNoteIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? colors.card : colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
    },
    timeNoteTextWrap: { flex: 1, minWidth: 0 },
    timeNoteTitle: { fontSize: 13, color: colors.primary, marginBottom: 4, ...f('semiBold') },
    timeNote: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, ...f('medium') },
    inputReadOnly: { backgroundColor: colors.backgroundSecondary, color: colors.textSecondary, ...f('semiBold') },

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
    /** Aligned with meal type pills (no negative bleed). */
    mealOptionsScroll: { marginBottom: 10, marginTop: 2 },
    mealOptionsScrollContent: { paddingRight: 16, paddingLeft: 0 },
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
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      backgroundColor: colors.backgroundSecondary,
      color: colors.text,
      ...f('medium'),
    },
    inputMultiline: { minHeight: 88, textAlignVertical: 'top' },

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

    photoZoneLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, ...f('semiBold') },
    photoUploadZone: {
      minHeight: 160,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    photoUploadZoneFilled: { padding: 0, minHeight: 0 },
    photoUploadHint: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
    photoUploadFormats: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    photoThumbWrap: { position: 'relative', width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' },
    photoThumbImage: { width: '100%', height: '100%', backgroundColor: colors.backgroundSecondary },
    removePhotoBtn: { position: 'absolute', top: 8, right: 8 },
    dropdownOptions: { marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, maxHeight: 200 },
    dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.backgroundSecondary },
    dropdownOptionText: { fontSize: 15, color: colors.textSecondary },

    emptyState: { alignItems: 'center', paddingVertical: 36 },
    emptyText: { fontSize: 16, color: colors.text, marginTop: 14, textAlign: 'center', ...f('semiBold') },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center', ...f('medium') },

    savingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    savingContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      minWidth: 180,
    },
    savingText: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    savingHint: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

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
    childListModalContent: { maxHeight: '88%', width: '100%', maxWidth: 400, alignSelf: 'center' },
    childListModalSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: -4,
      marginBottom: 14,
      lineHeight: 20,
      ...f('medium'),
    },
    childListSearchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 14,
      paddingHorizontal: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    childListSearchIcon: { marginRight: 8 },
    childListSearchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      ...f('regular'),
    },
    childListModalActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    childListModalQuickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    childListModalQuickBtnText: { fontSize: 14, color: colors.primary, ...f('semiBold') },
    childListModalQuickBtnTextMuted: { color: colors.textSecondary },
    childListModalScroll: { maxHeight: 360, marginHorizontal: -4 },
    childListEmptySearch: {
      paddingVertical: 28,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 15,
      ...f('medium'),
    },
    childListRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      marginBottom: 8,
      gap: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
    },
    childListRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    childListRowAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.avatarBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    childListRowAvatarSelected: { backgroundColor: isDark ? colors.avatarBg : colors.card },
    childListRowInitials: { fontSize: 16, color: colors.avatarText, ...f('bold') },
    childListRowInitialsSelected: { color: colors.primary },
    childListRowName: { fontSize: 16, color: colors.text, ...f('semiBold') },
    childListRowNameSelected: { color: colors.primary },
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

    variationModalKb: { flex: 1 },
    variationModalRoot: {
      flex: 1,
    },
    variationModalDimmer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    variationModalCard: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    variationModalCardInner: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
      maxHeight: '88%',
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      ...(!isDark
        ? {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
          }
        : {}),
    },
    variationModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 8,
    },
    variationModalHeaderText: { flex: 1, minWidth: 0 },
    variationModalEyebrow: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
      ...f('semiBold'),
    },
    variationModalTitle: { fontSize: 20, color: colors.text, marginTop: 4, ...f('bold') },
    variationModalCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    variationModalHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
      lineHeight: 20,
      ...f('medium'),
    },
    variationModalScroll: { maxHeight: 320 },
    variationModalScrollContent: { flexGrow: 1, paddingBottom: 8 },
    variationModalActions: {
      marginTop: 12,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
      gap: 12,
    },
    variationModalClearBtn: { paddingVertical: 8, alignItems: 'center' },
    variationModalClearText: { fontSize: 15, color: colors.danger, ...f('semiBold') },
    variationModalPrimaryActions: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    variationModalSaveBtn: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.ctaPurple,
      alignItems: 'center',
      justifyContent: 'center',
    },
    variationModalSaveBtnText: { fontSize: 16, color: '#FFFFFF', ...f('bold') },
    variationModalCancelBtn: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    variationModalCancelText: { fontSize: 16, color: colors.textSecondary, ...f('semiBold') },
  });
}
