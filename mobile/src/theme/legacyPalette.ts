import type { ColorPalette } from './colors';
import type { BrandPalette } from './palette';
import type { CategoryPalette } from './category';

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
