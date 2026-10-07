/**
 * Body font for screens styled with the legacy weight names. Mapped onto the
 * redesign's Figtree (loaded in App.tsx) so every screen uses the new type.
 */
export const font = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semiBold: 'Figtree_700Bold',
  bold: 'Figtree_800ExtraBold',
} as const;

/**
 * Teacher redesign fonts, loaded in App.tsx: Bricolage Grotesque (display)
 * and Figtree (body). One family per weight, so never set fontWeight with these.
 */
export const brandFont = {
  display600: 'BricolageGrotesque_600SemiBold',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'Figtree_400Regular',
  body500: 'Figtree_500Medium',
  body600: 'Figtree_600SemiBold',
  body700: 'Figtree_700Bold',
  body800: 'Figtree_800ExtraBold',
} as const;
