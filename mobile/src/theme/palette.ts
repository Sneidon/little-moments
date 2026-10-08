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
