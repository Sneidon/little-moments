import { StyleSheet } from 'react-native';
import type { Theme } from '../../../hooks/useThemedStyles';
import { brandFont } from '../../../theme/typography';
import { radius } from '../../../theme/tokens';
import type { EventHighlight } from './calendarUtils';

type Tone = { accent: string; background: string; text: string };

/** Upcoming events use the nap lilac, happening-now the attendance mint, past ones stay neutral. */
export function highlightColors({ brand, category }: Pick<Theme, 'brand' | 'category'>, h: EventHighlight): Tone {
  if (h === 'upcoming') return { accent: category.nap, background: category.nap, text: category.onCategory };
  if (h === 'ongoing') return { accent: category.attendance, background: category.attendance, text: category.onCategory };
  return { accent: brand.textTertiary, background: brand.surfaceRaised, text: brand.textSecondary };
}

export const createCalendarStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: brand.surface, borderRadius: radius.card, padding: 16, marginBottom: 14 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
    navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
    navTitle: { flex: 1, textAlign: 'center', fontSize: 19, color: brand.textPrimary, fontFamily: brandFont.display800 },
    navTitleShrink: { fontSize: 16 },
    mutedCenter: { textAlign: 'center', color: brand.textTertiary, marginVertical: 12, fontFamily: brandFont.body600, fontSize: 14 },
  });
