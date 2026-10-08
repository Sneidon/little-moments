import type { TextStyle } from 'react-native';
import { brandFont } from './typography';

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
 * Height of the native tab bars, used by useTabBarClearance. Both float over the screen content:
 * iOS's Liquid Glass bar, and Android's Material 3 bar, which react-native-screens lays on top of a
 * full-height content view. The system navigation / home indicator inset comes on top of these.
 */
export const NATIVE_TAB_BAR_CLEARANCE_IOS = 72;
export const NATIVE_TAB_BAR_HEIGHT_ANDROID = 80;
