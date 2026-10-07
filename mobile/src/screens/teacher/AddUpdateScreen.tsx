import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton } from '../../components/brand/Buttons';
import { spacing } from '../../theme/tokens';
import { selectAllChildrenLabel } from '../../utils/childPresence';
import type { ReportType } from '@shared/types';
import type { RootStackParamList } from '../../navigation/types';
import { AddUpdateHeader } from './add-update/components/AddUpdateHeader';
import { SavingOverlay, SelectionHintCard, TimesBanner } from './add-update/components/Banners';
import { ChildSearchModal } from './add-update/components/ChildSearchModal';
import { VariationModal } from './add-update/components/VariationModal';
import { WhatCard } from './add-update/components/WhatCard';
import { WhoCard } from './add-update/components/WhoCard';
import { UpdateFormCard } from './add-update/UpdateFormCard';
import { useMediaAttachment } from './add-update/hooks/useMediaAttachment';
import { useRoster } from './add-update/hooks/useRoster';
import { useSubmitUpdate } from './add-update/hooks/useSubmitUpdate';
import { useClock, useMealOptions, useUpdateFields } from './add-update/hooks/useUpdateFields';
import { useVariations } from './add-update/hooks/useVariations';

type Props = NativeStackScreenProps<RootStackParamList, 'AddUpdate'>;

export function AddUpdateScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const { brand } = useTheme();
  const [type, setType] = useState<ReportType>((route.params?.initialType as ReportType) ?? 'meal');
  const [searchOpen, setSearchOpen] = useState(false);
  const clock = useClock();
  const mealOptions = useMealOptions(profile?.schoolId);
  const { fields, patch } = useUpdateFields(type, mealOptions);
  const variations = useVariations(type, fields, mealOptions);
  const roster = useRoster(type, route.params?.initialChildId, variations.clearFor);
  const media = useMediaAttachment(roster.children.length);
  const { submit, saving } = useSubmitUpdate({
    type,
    children: roster.children,
    selectedIds: roster.selectedIds,
    isEligible: roster.isEligible,
    loadingPresence: roster.loadingPresence,
    valuesFor: variations.valuesFor,
    mealOptions,
    media,
    onDone: () => navigation.goBack(),
  });

  useEffect(() => {
    const initial = route.params?.initialType as ReportType | undefined;
    if (initial) setType(initial);
  }, [route.params?.initialType]);

  const hasSelection = roster.selectedChildren.length > 0;
  const editingChild = roster.selectedChildren.find((c) => c.id === variations.editingChildId);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: brand.background }} contentContainerStyle={styles.content}>
      <AddUpdateHeader whoStepActive={!hasSelection} onBack={() => navigation.goBack()} />

      <WhoCard
        type={type}
        children={roster.children}
        rosterLoaded={roster.rosterLoaded}
        selectedIds={roster.selectedIds}
        selectedChildren={roster.selectedChildren}
        isEligible={roster.isEligible}
        hasOverride={(id) => !!variations.overrides[id]}
        onToggle={roster.toggle}
        onSelectAll={roster.selectAll}
        onClear={roster.clear}
        onSearch={() => setSearchOpen(true)}
        onEditVariation={variations.open}
      />

      <WhatCard type={type} onChange={setType} />

      {roster.rosterLoaded && roster.children.length > 0 && !hasSelection ? (
        <SelectionHintCard selectAllLabel={selectAllChildrenLabel(type)} />
      ) : null}

      {hasSelection ? (
        <>
          <TimesBanner />
          <UpdateFormCard
            type={type}
            values={fields}
            onChange={patch}
            editable={!saving}
            clock={clock}
            mealOptions={mealOptions}
            media={media}
            rosterLoaded={roster.rosterLoaded}
            childCount={roster.children.length}
          />
          <View style={styles.post}>
            <PrimaryButton
              label={saving ? 'Posting…' : roster.loadingPresence ? 'Loading…' : 'Post update'}
              icon="send"
              onPress={submit}
              disabled={saving || roster.loadingPresence}
            />
          </View>
        </>
      ) : null}

      <VariationModal
        type={type}
        childName={editingChild?.name ?? null}
        draft={variations.draft}
        onChange={variations.patchDraft}
        hasOverride={!!(variations.editingChildId && variations.overrides[variations.editingChildId])}
        mealOptions={mealOptions}
        clock={clock}
        onSave={variations.save}
        onCancel={variations.close}
        onReset={variations.resetEditing}
      />
      <ChildSearchModal
        visible={searchOpen}
        children={roster.children}
        selectedIds={roster.selectedIds}
        isEligible={roster.isEligible}
        onToggle={roster.toggle}
        onSelectAll={roster.selectAll}
        onClear={roster.clear}
        onClose={() => setSearchOpen(false)}
      />
      <SavingOverlay visible={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },
  post: { marginTop: 4, marginBottom: 8 },
});
