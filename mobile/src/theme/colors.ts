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
};

export const lightColors: ColorPalette = {
  background: '#f8fafc',
  backgroundSecondary: '#f1f5f9',
  card: '#fff',
  cardBorder: '#e2e8f0',
  text: '#1e293b',
  textSecondary: '#334155',
  textMuted: '#64748b',
  primary: '#6366f1',
  primaryMuted: '#eef2ff',
  primaryContrast: '#fff',
  header: '#6d28d9',
  headerText: '#fff',
  headerTextMuted: 'rgba(255,255,255,0.9)',
  headerAccent: 'rgba(255,255,255,0.25)',
  border: '#e2e8f0',
  inputBackground: '#fff',
  inputBorder: '#e2e8f0',
  success: '#16a34a',
  warning: '#ea580c',
  danger: '#dc2626',
  dangerMuted: '#fef2f2',
  tabActive: '#6366f1',
  tabInactive: '#94a3b8',
  avatarBg: '#e0e7ff',
  avatarText: '#6366f1',
};

export const darkColors: ColorPalette = {
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
  card: '#1e293b',
  cardBorder: '#334155',
  text: '#f1f5f9',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#818cf8',
  primaryMuted: '#312e81',
  primaryContrast: '#fff',
  header: '#5b21b6',
  headerText: '#fff',
  headerTextMuted: 'rgba(255,255,255,0.9)',
  headerAccent: 'rgba(255,255,255,0.2)',
  border: '#334155',
  inputBackground: '#1e293b',
  inputBorder: '#475569',
  success: '#22c55e',
  warning: '#f97316',
  danger: '#ef4444',
  dangerMuted: '#450a0a',
  tabActive: '#a5b4fc',
  tabInactive: '#64748b',
  avatarBg: '#4338ca',
  avatarText: '#c7d2fe',
};
