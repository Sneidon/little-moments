import React, { useEffect, useState } from 'react';
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
import type { Child } from '../../../../shared/types';
import type { ClassRoom } from '../../../../shared/types';
import type { ReportType } from '../../../../shared/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type TeacherStackParamList = {
  TeacherHome: undefined;
  Reports: { childId: string };
  AddUpdate: { initialType?: 'incident' } | undefined;
  Announcements: undefined;
  Events: undefined;
  Settings: undefined;
};
type Props = NativeStackScreenProps<TeacherStackParamList, 'AddUpdate'>;

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

export function AddUpdateScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [type, setType] = useState<ReportType>(
    route.params?.initialType === 'incident' ? 'incident' : 'meal'
  );
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'snack'>('lunch');
  const [mealAmount, setMealAmount] = useState('most');
  const [notes, setNotes] = useState('');
  const [mealTime, setMealTime] = useState(() => formatTime(new Date()));
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState<string | null>(null);
  const [nappyTime, setNappyTime] = useState(() => formatTime(new Date()));
  const [nappyType, setNappyType] = useState('wet');
  const [nappyCondition, setNappyCondition] = useState('normal');
  const [napStartTime, setNapStartTime] = useState('13:00');
  const [napEndTime, setNapEndTime] = useState('14:30');
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
          if (list.length > 0 && !selectedChildId) setSelectedChildId(list[0].id);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [profile?.schoolId, profile?.uid]);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const parseTime = (s: string): Date => {
    const now = new Date();
    const [h, m] = s.split(':').map(Number);
    if (!isNaN(h)) now.setHours(h, isNaN(m) ? 0 : m, 0, 0);
    return now;
  };

  const submit = async () => {
    const schoolId = profile?.schoolId;
    if (!schoolId || !selectedChildId) {
      Alert.alert('Select a child', 'Choose a child first.');
      return;
    }
    if (type === 'incident' && !photoUri) {
      Alert.alert('Add a photo', 'Take or choose a photo to log.');
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      let timestamp = now;
      if (type === 'meal') timestamp = parseTime(mealTime);
      if (type === 'nappy_change') timestamp = parseTime(nappyTime);
      if (type === 'nap_time') timestamp = parseTime(napStartTime);
      if (type === 'medication') timestamp = parseTime(activityTime);

      const payload: Record<string, unknown> = {
        childId: selectedChildId,
        schoolId,
        type,
        reportedBy: profile!.uid,
        notes: notes.trim() || undefined,
        timestamp: timestamp.toISOString(),
        createdAt: now.toISOString(),
      };
      if (type === 'meal') {
        payload.mealType = mealType;
        payload.mealAmount = mealAmount;
      }
      if (type === 'nappy_change') {
        payload.nappyType = nappyType;
        payload.nappyCondition = nappyCondition;
      }
      if (type === 'nap_time') {
        payload.napStartTime = napStartTime;
        payload.napEndTime = napEndTime;
        payload.sleepQuality = sleepQuality;
      }
      if (type === 'medication') {
        payload.activityType = activityType || undefined;
        payload.activityTitle = activityTitle.trim() || undefined;
        payload.medicationName = activityType || undefined;
        if (activityDescription.trim()) payload.notes = activityDescription.trim();
      }
      if (type === 'incident') {
        if (photoUri) {
          const imageUrl = await uploadPhotoAsync(photoUri, schoolId, selectedChildId);
          payload.imageUrl = imageUrl;
        }
        if (photoCategory) payload.photoCategory = photoCategory;
      }
      await addDoc(
        collection(db, 'schools', schoolId, 'children', selectedChildId, 'reports'),
        payload
      );
      Alert.alert('Done', 'Update saved.');
      setNotes('');
      setPhotoUri(null);
      setPhotoCategory(null);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.pageTitle}>Add Update</Text>
      <Text style={styles.pageSubtitle}>Log daily activities for your students.</Text>

      {/* Select Child card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Child</Text>
        <TouchableOpacity
          style={styles.dropdownRow}
          onPress={() => children.length > 0 && setChildPickerOpen(true)}
          disabled={children.length === 0}
        >
          <Text style={[styles.dropdownText, !selectedChild && styles.dropdownPlaceholder]}>
            {selectedChild ? selectedChild.name : 'Select a child'}
          </Text>
          {selectedChild && (
            <View style={styles.presentTag}>
              <Text style={styles.presentTagText}>Present</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>
        {selectedChild && (
          <View style={styles.selectedChildProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(selectedChild.name)}</Text>
            </View>
            <View style={styles.selectedChildInfo}>
              <Text style={styles.selectedChildName}>{selectedChild.name}</Text>
              <Text style={styles.selectedChildAge}>{getAge(selectedChild.dateOfBirth)} old</Text>
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

      {selectedChild && (
        <>
          {type === 'meal' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Meal</Text>

              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.optionsRow}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.optionChip, mealType === m.value && styles.optionChipActive]}
                    onPress={() => setMealType(m.value)}
                  >
                    <Text style={[styles.optionChipText, mealType === m.value && styles.optionChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>What did they eat?</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Chicken nuggets, carrots, apple slices"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <TouchableOpacity style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>Preview</Text>
              </TouchableOpacity>

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
                style={styles.input}
                value={mealTime}
                onChangeText={setMealTime}
                placeholder="12:00"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color="#fff" style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Log Meal'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'incident' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Upload Photo</Text>
              <Text style={styles.photoZoneLabel}>Photo</Text>
              <TouchableOpacity
                style={[styles.photoUploadZone, photoUri && styles.photoUploadZoneFilled]}
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
                placeholderTextColor="#94a3b8"
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
                <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Uploading…' : 'Upload Photo'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'nappy_change' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Nappy Change</Text>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={nappyTime}
                onChangeText={setNappyTime}
                placeholder="14:48"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>Type</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'nappyType' ? null : 'nappyType')}
              >
                <Text style={styles.dropdownText}>
                  {NAPPY_TYPES.find((n) => n.value === nappyType)?.label ?? 'Wet'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color="#fff" style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Log Nappy Change'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {type === 'nap_time' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Log Nap Time</Text>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={napStartTime}
                onChangeText={setNapStartTime}
                placeholder="13:00"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                value={napEndTime}
                onChangeText={setNapEndTime}
                placeholder="14:30"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>Sleep Quality</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => setDropdownOpen(dropdownOpen === 'sleepQuality' ? null : 'sleepQuality')}
              >
                <Text style={styles.dropdownText}>
                  {SLEEP_QUALITY_OPTIONS.find((s) => s.value === sleepQuality)?.label ?? 'Good - Fell asleep easily'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="send" size={20} color="#fff" style={styles.primaryButtonIcon} />
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
                <Ionicons name="chevron-down" size={20} color="#64748b" />
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
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={activityDescription}
                onChangeText={setActivityDescription}
                placeholder="Describe what the child did and how they engaged..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                editable={!loading}
              />
              <Text style={styles.label}>Time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={activityTime}
                  onChangeText={setActivityTime}
                  placeholder="10:30"
                  placeholderTextColor="#94a3b8"
                  editable={!loading}
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
                <Ionicons name="send" size={20} color="#fff" style={styles.primaryButtonIcon} />
                <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Add Activity'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {children.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No children assigned to your class.</Text>
        </View>
      )}

      {/* Child picker modal */}
      <Modal
        visible={childPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChildPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChildPickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Child</Text>
            {children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedChildId(c.id);
                  setChildPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>{c.name}</Text>
                <Text style={styles.modalOptionAge}>{getAge(c.dateOfBirth)} old</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 15, color: '#64748b', marginTop: 4, marginBottom: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },

  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dropdownText: { flex: 1, fontSize: 15, color: '#334155', fontWeight: '500' },
  dropdownPlaceholder: { color: '#94a3b8' },
  presentTag: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  presentTagText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  selectedChildProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  selectedChildInfo: { flex: 1 },
  selectedChildName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  selectedChildAge: { fontSize: 14, color: '#64748b', marginTop: 2 },

  tabsWrapper: { marginBottom: 16 },
  tabsScroll: { gap: 8, paddingVertical: 4 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 80,
  },
  tabActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 6 },
  tabLabelActive: { color: '#6366f1' },

  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  optionChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  optionChipText: { fontSize: 14, color: '#64748b' },
  optionChipTextActive: { color: '#6366f1', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  previewBtn: { alignSelf: 'flex-start', marginTop: 8 },
  previewBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
  },
  primaryButtonIcon: { marginRight: 8 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  photoZoneLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  photoUploadZone: {
    minHeight: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  photoUploadZoneFilled: { padding: 0, minHeight: 0 },
  photoUploadHint: { fontSize: 14, color: '#64748b', marginTop: 12 },
  photoUploadFormats: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  photoPreviewWrap: { position: 'relative', width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' },
  photoPreviewInZone: { width: '100%', height: '100%', backgroundColor: '#f1f5f9' },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8 },
  dropdownOptions: { marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', maxHeight: 200 },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionText: { fontSize: 15, color: '#334155' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeInput: { flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: '#64748b', marginTop: 12 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  modalOptionAge: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
