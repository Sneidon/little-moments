import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { EditChildProfileScreen } from '../screens/parent/EditChildProfileScreen';
import { useEditChildProfileParams } from '../screens/parent/useEditChildProfileParams';
import { EditChildProfileTeacherScreen } from '../screens/teacher/EditChildProfileTeacherScreen';

export function EditChildProfileScreenWrapper() {
  const navigation = useNavigation();
  const { child, schoolId } = useEditChildProfileParams();
  const goBack = () => (navigation as { goBack: () => void }).goBack();
  if (!child || !schoolId) return null;
  return <EditChildProfileScreen child={child} schoolId={schoolId} onSaved={goBack} onCancel={goBack} />;
}

export function EditChildProfileTeacherScreenWrapper() {
  const navigation = useNavigation();
  const { child, schoolId } = useEditChildProfileParams();
  const goBack = () => (navigation as { goBack: () => void }).goBack();
  if (!child || !schoolId) return null;
  return <EditChildProfileTeacherScreen child={child} schoolId={schoolId} onSaved={goBack} onCancel={goBack} />;
}
