/** Inter, loaded in App.tsx via @expo-google-fonts/inter */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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
