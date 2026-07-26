export const colors = {
  primary: {
    50: '#F0EDFF',
    100: '#E0D9FF',
    200: '#C2B3FF',
    300: '#A38DFF',
    400: '#8567FF',
    500: '#7A5AF5',
    600: '#5D3FD3',
    700: '#3F2A7A',
    800: '#2D1F5E',
    900: '#1A103C',
  },
  secondary: {
    50: '#FDF7E9',
    100: '#FBEFD3',
    200: '#F7DFA7',
    300: '#F3CF7B',
    400: '#E5C87B',
    500: '#D4AF37',
    600: '#B8860B',
    700: '#8B6508',
    800: '#5D4305',
    900: '#2E2203',
  },
  neutral: {
    50: '#F9F7F5',
    100: '#F0EDE8',
    200: '#E5E0D9',
    300: '#D4CDC4',
    400: '#B8B0A6',
    500: '#9C948A',
    600: '#6B6258',
    700: '#554D44',
    800: '#2D2D2D',
    900: '#1A1A1A',
  },
  success: {
    light: '#E8F3F0',
    main: '#2E5C4E',
    dark: '#1E3E34',
    contrast: '#FFFFFF',
  },
  warning: {
    light: '#FEF0ED',
    main: '#B65F4A',
    dark: '#7A4031',
    contrast: '#FFFFFF',
  },
  info: {
    light: '#EDF2F9',
    main: '#4A6FA5',
    dark: '#314A6E',
    contrast: '#FFFFFF',
  },
  error: {
    light: '#FEE9E9',
    main: '#DC2626',
    dark: '#B91C1C',
    contrast: '#FFFFFF',
  },
}

export const gradients = {
  primary: 'bg-gradient-to-br from-primary-600 to-primary-800',
  secondary: 'bg-gradient-to-br from-secondary-500 to-secondary-600',
  sunset: 'bg-gradient-to-br from-orange-500 to-pink-500',
  ocean: 'bg-gradient-to-br from-blue-500 to-teal-500',
  forest: 'bg-gradient-to-br from-green-500 to-emerald-500',
  royal: 'bg-gradient-to-br from-purple-600 to-indigo-600',
  gold: 'bg-gradient-to-br from-yellow-400 to-amber-600',
  silver: 'bg-gradient-to-br from-gray-300 to-gray-400',
  cosmic: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900',
  earth: 'bg-gradient-to-br from-amber-700 via-yellow-600 to-green-700',
}

// FIX: previously had 6 keys (love, career, wealth, spiritual, health,
// life-path) against the real 8-domain set (love, wealth, wellness,
// life-path, oracle-temple, sacred-script, time-keeper, voice).
// "career" was never a real domain (career tools live inside Wealth) —
// kept below as a deprecated alias pointing at wealth's colors, in case
// something already references domainColors.career directly, rather than
// silently removing a key that might still be in use somewhere.
// Colors here match the accent system already established in page.tsx's
// DOMAIN_CONFIG, so this file and the live tool pages stay in sync.
export const domainColors = {
  love: {
    primary: '#EC4899',
    light: '#FDF2F8',
    dark: '#831843',
    gradient: 'from-pink-500 to-rose-500',
    icon: '❤️',
  },
  wealth: {
    primary: '#10B981',
    light: '#ECFDF5',
    dark: '#065F46',
    gradient: 'from-emerald-500 to-green-500',
    icon: '💰',
  },
  wellness: {
    primary: '#D946EF',
    light: '#FDF4FF',
    dark: '#86198F',
    gradient: 'from-fuchsia-500 to-purple-500',
    icon: '✨',
  },
  'life-path': {
    primary: '#F59E0B',
    light: '#FFFBEB',
    dark: '#92400E',
    gradient: 'from-amber-500 to-orange-500',
    icon: '🌟',
  },
  'oracle-temple': {
    primary: '#3B82F6',
    light: '#EFF6FF',
    dark: '#1E3A8A',
    gradient: 'from-blue-500 to-indigo-500',
    icon: '🔮',
  },
  'sacred-script': {
    primary: '#EF4444',
    light: '#FEF2F2',
    dark: '#991B1B',
    gradient: 'from-red-500 to-rose-500',
    icon: '📜',
  },
  'time-keeper': {
    primary: '#14B8A6',
    light: '#F0FDFA',
    dark: '#115E59',
    gradient: 'from-teal-500 to-cyan-500',
    icon: '⏳',
  },
  voice: {
    primary: '#818CF8',
    light: '#EEF2FF',
    dark: '#3730A3',
    gradient: 'from-indigo-400 to-violet-400',
    icon: '🎙️',
  },
  // deprecated alias — "career" isn't a real domain, remove once confirmed unused
  career: {
    primary: '#10B981',
    light: '#ECFDF5',
    dark: '#065F46',
    gradient: 'from-emerald-500 to-green-500',
    icon: '💰',
  },
}

export const chartColors = [
  '#5D3FD3', // primary-600
  '#D4AF37', // secondary-500
  '#2E5C4E', // success
  '#B65F4A', // warning
  '#4A6FA5', // info
  '#7A5AF5', // primary-500
  '#E5C87B', // secondary-400
  '#6B6258', // neutral-600
  '#1A103C', // primary-900
  '#B8860B', // secondary-600
]

export const statusColors = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  warning: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
}

export const textColors = {
  primary: 'text-neutral-900',
  secondary: 'text-neutral-600',
  tertiary: 'text-neutral-500',
  disabled: 'text-neutral-400',
  accent: 'text-primary-600',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
}

export const backgroundColors = {
  primary: 'bg-neutral-50',
  secondary: 'bg-neutral-100',
  card: 'bg-white',
  overlay: 'bg-black/50',
  accent: 'bg-primary-50',
  success: 'bg-success-light',
  warning: 'bg-warning-light',
  error: 'bg-error-light',
  info: 'bg-info-light',
}

export const borderColors = {
  light: 'border-neutral-200',
  medium: 'border-neutral-300',
  dark: 'border-neutral-400',
  accent: 'border-primary-600',
  success: 'border-success',
  warning: 'border-warning',
  error: 'border-error',
  info: 'border-info',
}
