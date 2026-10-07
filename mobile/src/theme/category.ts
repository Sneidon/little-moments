import type React from 'react';
import type { Ionicons } from '@expo/vector-icons';

type CategoryKey =
  | 'attendance'
  | 'meal'
  | 'photo'
  | 'nap'
  | 'activity'
  | 'checkOut'
  | 'nappy'
  | 'medication'
  | 'media'
  | 'napStat';

export type CategoryPalette = Record<CategoryKey, string> & {
  onCategory: string;
  onCategoryMuted: string;
};

const onCategory = '#1E1638';
const onCategoryMuted = '#4B4466';

export const categoryLight: CategoryPalette = {
  attendance: '#9EE6C9',
  meal: '#FFB872',
  photo: '#FF9C8F',
  nap: '#C9B8FF',
  activity: '#FFD84D',
  checkOut: '#A9D4FF',
  nappy: '#B5EAF0',
  medication: '#FF9C8F',
  media: '#FFC2E2',
  napStat: '#A9D4FF',
  onCategory,
  onCategoryMuted,
};

export const categoryDark: CategoryPalette = {
  attendance: '#7FD6B4',
  meal: '#F5A55C',
  photo: '#F48A7D',
  nap: '#B3A0F5',
  activity: '#F2CB3A',
  checkOut: '#8FC2F2',
  nappy: '#93D9E2',
  medication: '#F48A7D',
  media: '#F2A9CF',
  napStat: '#8FC2F2',
  onCategory,
  onCategoryMuted,
};

const AVATAR_CATEGORIES: CategoryKey[] = ['nap', 'attendance', 'meal', 'checkOut', 'media', 'activity'];

export function avatarCategoryColor(category: CategoryPalette, index: number): string {
  return category[AVATAR_CATEGORIES[index % AVATAR_CATEGORIES.length]];
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const UPDATE_TYPE_STYLE: Record<
  string,
  { category: CategoryKey; icon: IoniconName }
> = {
  check_in: { category: 'attendance', icon: 'log-in-outline' },
  check_out: { category: 'checkOut', icon: 'log-out-outline' },
  child_joined_class: { category: 'attendance', icon: 'person-add-outline' },
  meal: { category: 'meal', icon: 'restaurant-outline' },
  nap: { category: 'nap', icon: 'moon-outline' },
  nap_time: { category: 'nap', icon: 'moon-outline' },
  nappy: { category: 'nappy', icon: 'water-outline' },
  nappy_change: { category: 'nappy', icon: 'water-outline' },
  class_change: { category: 'checkOut', icon: 'school-outline' },
  medication: { category: 'medication', icon: 'medkit-outline' },
  activity: { category: 'activity', icon: 'color-palette-outline' },
  incident: { category: 'media', icon: 'image-outline' },
  planned: { category: 'activity', icon: 'calendar-outline' },
};

export function updateTypeStyle(type: string) {
  return UPDATE_TYPE_STYLE[type] ?? { category: 'activity' as CategoryKey, icon: 'ellipse-outline' as IoniconName };
}
