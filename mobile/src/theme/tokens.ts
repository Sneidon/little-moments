/**
 * Teacher redesign tokens (Mahlahle Daycare handoff, tokens.json).
 * Additive: only the reskinned teacher screens and teacher tab bar use these.
 * The legacy palette in colors.ts still drives every other screen.
 */
import type React from 'react';
import type { TextStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { brandFont } from './typography';
import type { ColorPalette } from './colors';

export type BrandPalette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  inverseFill: string;
  onInverse: string;
  primaryButton: string;
  onPrimaryButton: string;
  primaryButtonIcon: string;
  headerBackground: string;
  onHeader: string;
  onHeaderMuted: string;
  tabBar: string;
  tabInactive: string;
  tabActive: string;
  disabledHatchA: string;
  disabledHatchB: string;
  disabledBorder: string;
  disabledAvatar: string;
  disabledText: string;
  statusPresent: string;
  /** Shadow colour for floating elements (not in tokens.json; taken from mockups). */
  shadow: string;
};

export const brandLight: BrandPalette = {
  background: '#F3F0FA',
  surface: '#FFFFFF',
  surfaceRaised: '#F3F0FA',
  textPrimary: '#1E1638',
  textSecondary: '#4B4466',
  textTertiary: '#7C7792',
  inverseFill: '#1E1638',
  onInverse: '#FFFFFF',
  primaryButton: '#2A1D63',
  onPrimaryButton: '#FFFFFF',
  primaryButtonIcon: '#FFD84D',
  headerBackground: '#2A1D63',
  onHeader: '#FFFFFF',
  onHeaderMuted: '#D8D2F5',
  tabBar: '#1E1638',
  tabInactive: '#C9C3E6',
  tabActive: '#FFD84D',
  disabledHatchA: '#F7F5FC',
  disabledHatchB: '#EFECF7',
  disabledBorder: '#CFCAE0',
  disabledAvatar: '#E4E0EF',
  disabledText: '#7C7792',
  statusPresent: '#1FA67A',
  shadow: '#1E1638',
};

export const brandDark: BrandPalette = {
  background: '#120E22',
  surface: '#1E1933',
  surfaceRaised: '#2A2445',
  textPrimary: '#F3F0FA',
  textSecondary: '#B7B0D2',
  textTertiary: '#8D86A8',
  inverseFill: '#F3F0FA',
  onInverse: '#1E1638',
  primaryButton: '#F2CB3A',
  onPrimaryButton: '#1E1638',
  primaryButtonIcon: '#1E1638',
  headerBackground: '#2A1D63',
  onHeader: '#FFFFFF',
  onHeaderMuted: '#D8D2F5',
  tabBar: '#2A2445',
  tabInactive: '#B7B0D2',
  tabActive: '#F2CB3A',
  disabledHatchA: '#1E1933',
  disabledHatchB: '#252040',
  disabledBorder: '#3D3658',
  disabledAvatar: '#2E2848',
  disabledText: '#8D86A8',
  statusPresent: '#1FA67A',
  shadow: '#000000',
};

export type CategoryKey =
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

/** Text and icons on category fills are always onCategory, in both modes. */
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

/** Rotating avatar fills for initials avatars (students, child tiles). */
export const AVATAR_CATEGORIES: CategoryKey[] = ['nap', 'attendance', 'meal', 'checkOut', 'media', 'activity'];

export function avatarCategoryColor(category: CategoryPalette, index: number): string {
  return category[AVATAR_CATEGORIES[index % AVATAR_CATEGORIES.length]];
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** One category colour + icon per update type. */
export const UPDATE_TYPE_STYLE: Record<
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

export const radius = {
  header: 40,
  cardL: 30,
  card: 28,
  tile: 22,
  button: 22,
  buttonS: 20,
  chip: 16,
  pill: 999,
} as const;

export const spacing = {
  screenX: 20,
  cardPadding: 20,
  gapS: 8,
  gapM: 14,
  gapL: 20,
} as const;

export const size = {
  touchMin: 44,
  roundButton: 48,
  avatarL: 88,
  avatarM: 64,
  typeTile: 64,
  tabItemHeight: 56,
} as const;

/** em → px for React Native letterSpacing. */
const ls = (em: number, fontSize: number) => Math.round(em * fontSize * 100) / 100;
/**
 * Tight display line-heights clip ascenders on Android, so floor them at a
 * safe multiple; iOS renders the design value closely enough at this floor.
 */
const lh = (mult: number, fontSize: number) => Math.round(Math.max(mult, 1.0) * fontSize);

export const type = {
  displayXL: {
    fontFamily: brandFont.display800,
    fontSize: 52,
    lineHeight: lh(0.95, 52),
    letterSpacing: ls(-0.035, 52),
    includeFontPadding: false,
  },
  statHero: {
    fontFamily: brandFont.display800,
    fontSize: 96,
    lineHeight: lh(0.9, 96),
    letterSpacing: ls(-0.05, 96),
    includeFontPadding: false,
  },
  statL: {
    fontFamily: brandFont.display800,
    fontSize: 64,
    lineHeight: lh(0.9, 64),
    letterSpacing: ls(-0.05, 64),
    includeFontPadding: false,
  },
  statM: {
    fontFamily: brandFont.display800,
    fontSize: 54,
    lineHeight: lh(0.9, 54),
    letterSpacing: ls(-0.05, 54),
    includeFontPadding: false,
  },
  nameL: {
    fontFamily: brandFont.display800,
    fontSize: 38,
    lineHeight: lh(0.92, 38),
    letterSpacing: ls(-0.035, 38),
    includeFontPadding: false,
  },
  section: {
    fontFamily: brandFont.display800,
    fontSize: 24,
    letterSpacing: ls(-0.02, 24),
  },
  cardTitle: {
    fontFamily: brandFont.display800,
    fontSize: 21,
    letterSpacing: ls(-0.02, 21),
  },
  overline: {
    fontFamily: brandFont.body800,
    fontSize: 13,
    letterSpacing: ls(0.08, 13),
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: brandFont.body500,
    fontSize: 15,
    lineHeight: Math.round(15 * 1.5),
  },
  label: {
    fontFamily: brandFont.body800,
    fontSize: 14,
  },
  caption: {
    fontFamily: brandFont.body700,
    fontSize: 13,
  },
} satisfies Record<string, TextStyle>;

/**
 * Maps the redesign tokens onto the legacy ColorPalette shape. ThemeContext
 * exposes this as `colors`, so every screen that still styles itself with
 * `colors.*` follows the redesign palette. Status colours (success/warning/
 * danger) and skeleton greys are kept from the legacy palette.
 */
export function legacyPaletteFromBrand(
  legacy: ColorPalette,
  brand: BrandPalette,
  category: CategoryPalette
): ColorPalette {
  return {
    ...legacy,
    background: brand.background,
    backgroundSecondary: brand.background,
    card: brand.surface,
    cardBorder: brand.disabledBorder,
    text: brand.textPrimary,
    textSecondary: brand.textSecondary,
    textMuted: brand.textTertiary,
    primary: brand.primaryButton,
    primaryMuted: brand.surfaceRaised,
    primaryContrast: brand.onPrimaryButton,
    header: brand.headerBackground,
    headerText: brand.onHeader,
    headerTextMuted: brand.onHeaderMuted,
    headerAccent: 'rgba(255,255,255,0.14)',
    border: brand.disabledBorder,
    inputBackground: brand.surfaceRaised,
    inputBorder: brand.surfaceRaised,
    tabActive: brand.primaryButton,
    tabInactive: brand.textSecondary,
    avatarBg: category.nap,
    avatarText: category.onCategory,
    accentPurple: brand.primaryButton,
    accentTeal: category.attendance,
    accentOrange: category.meal,
    accentPurpleSoft: brand.surfaceRaised,
    accentTealSoft: brand.surfaceRaised,
    accentOrangeSoft: brand.surfaceRaised,
    ctaPurple: brand.primaryButton,
    online: brand.statusPresent,
    tabBarBg: brand.surface,
  };
}

/**
 * Extra bottom padding for scrollable tab screens that draw edge-to-edge headers
 * and so opt out of the native tabs' automatic inset adjustment: on iOS the
 * (Liquid Glass) tab bar floats over content; Android's Material bar does not.
 */
export const NATIVE_TAB_BAR_CLEARANCE_IOS = 72;
