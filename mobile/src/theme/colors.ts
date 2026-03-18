export type ColorPalette = {
  background: string;
  backgroundSecondary: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  primaryContrast: string;
  header: string;
  headerText: string;
  headerTextMuted: string;
  headerAccent: string;
  border: string;
  inputBackground: string;
  inputBorder: string;
  success: string;
  warning: string;
  danger: string;
  dangerMuted: string;
  tabActive: string;
  tabInactive: string;
  avatarBg: string;
  avatarText: string;
  skeleton: string;
  skeletonHighlight: string;
  /** Dashboard accents (Little Angels design) */
  accentPurple: string;
  accentTeal: string;
  accentOrange: string;
  accentPurpleSoft: string;
  accentTealSoft: string;
  accentOrangeSoft: string;
  ctaPurple: string;
  online: string;
  tabBarBg: string;
};

export const lightColors: ColorPalette = {
  background: '#FFFFFF',
  /** Page chrome — same as scroll body so sections don’t “band” */
  backgroundSecondary: '#F0F2F5',
  card: '#FFFFFF',
  cardBorder: '#D1D5DB',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  primary: '#7B61FF',
  primaryMuted: 'rgba(123, 97, 255, 0.12)',
  primaryContrast: '#FFFFFF',
  header: '#7B61FF',
  headerText: '#FFFFFF',
  headerTextMuted: 'rgba(255,255,255,0.92)',
  headerAccent: 'rgba(255,255,255,0.22)',
  border: '#E2E8F0',
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  success: '#38A169',
  warning: '#F6AD55',
  danger: '#E53E3E',
  dangerMuted: '#FED7D7',
  tabActive: '#7B61FF',
  tabInactive: '#A0AEC0',
  avatarBg: 'rgba(123, 97, 255, 0.12)',
  avatarText: '#7B61FF',
  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
  accentPurple: '#7B61FF',
  accentTeal: '#4FD1C5',
  accentOrange: '#F6AD55',
  accentPurpleSoft: 'rgba(123, 97, 255, 0.14)',
  accentTealSoft: 'rgba(79, 209, 197, 0.18)',
  accentOrangeSoft: 'rgba(246, 173, 85, 0.2)',
  ctaPurple: '#7B61FF',
  online: '#48BB78',
  tabBarBg: '#FFFFFF',
};

export const darkColors: ColorPalette = {
  background: '#0B0B0B',
  backgroundSecondary: '#111111',
  card: '#1A1A1A',
  cardBorder: '#2D2D2D',
  text: '#F7FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#A0AEC0',
  primary: '#3B82F6',
  primaryMuted: 'rgba(59, 130, 246, 0.15)',
  primaryContrast: '#FFFFFF',
  header: '#1E3A5F',
  headerText: '#FFFFFF',
  headerTextMuted: 'rgba(255,255,255,0.75)',
  headerAccent: 'rgba(59, 130, 246, 0.25)',
  border: '#2D2D2D',
  inputBackground: '#1A1A1A',
  inputBorder: '#3D3D3D',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerMuted: '#450A0A',
  tabActive: '#3B82F6',
  tabInactive: '#6B7280',
  avatarBg: 'rgba(59, 130, 246, 0.2)',
  avatarText: '#93C5FD',
  skeleton: '#2D2D2D',
  skeletonHighlight: '#3D3D3D',
  accentPurple: '#3B82F6',
  accentTeal: '#4FD1C5',
  accentOrange: '#F6AD55',
  accentPurpleSoft: 'rgba(59, 130, 246, 0.2)',
  accentTealSoft: 'rgba(79, 209, 197, 0.2)',
  accentOrangeSoft: 'rgba(246, 173, 85, 0.18)',
  ctaPurple: '#2563EB',
  online: '#4ADE80',
  tabBarBg: '#141414',
};
