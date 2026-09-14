import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  background: '#eaf4f8',
  surface: '#ffffff',
  text: '#0c2a3d',
  muted: '#5b7384',
  mutedStrong: '#3d5a6c',
  border: '#d4e5ee',
  primary: '#0e5a72',
  primarySoft: '#147a93',
  accent: '#1fb6a6',
  danger: '#e11d48',
  dangerBg: '#ffe4e6',
  success: '#15803d',
  warning: '#c2410c',
  info: '#0369a1',
  white: '#ffffff',
  error: '#be123c',
  hero: '#0c4a62',
  heroGlow: '#1fb6a6',
  overlay: 'rgba(12, 42, 61, 0.4)',
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const font = {
  label: 12,
  body: 15,
  title: 16,
  heading: 24,
} as const;

export const touch = {
  minHeight: 48,
} as const;

export const shadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 12px 32px rgba(14, 90, 114, 0.14)',
  },
  ios: {
    shadowColor: '#0e5a72',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: {
    elevation: 6,
  },
}) as ViewStyle;
