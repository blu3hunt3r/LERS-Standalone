/**
 * Global Design System
 * Based on reference images - Modern SaaS aesthetic
 */

export const colors = {
  // Primary palette
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',  // Main primary (Indigo)
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  
  // Slate (neutrals)
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  // Semantic colors
  success: '#16A34A',  // green-600
  warning: '#EAB308',  // yellow-500
  error: '#DC2626',    // red-600
  info: '#3B82F6',     // blue-500
  
  // Risk levels
  risk: {
    critical: '#DC2626',  // red-600
    high: '#EA580C',      // orange-600
    medium: '#EAB308',    // yellow-500
    low: '#16A34A',       // green-600
  },
  
  // Entity categories
  category: {
    contact: '#6366F1',    // indigo-500
    financial: '#EC4899',  // pink-500
    identity: '#8B5CF6',   // purple-500
    network: '#06B6D4',    // cyan-500
    location: '#3B82F6',   // blue-500
    device: '#14B8A6',     // teal-500
    business: '#A855F7',   // purple-600
    other: '#64748B',      // slate-500
  },
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
  
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
};

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
};

export const components = {
  button: {
    primary: {
      bg: colors.primary[500],
      hover: colors.primary[600],
      text: '#FFFFFF',
    },
    secondary: {
      bg: colors.slate[100],
      hover: colors.slate[200],
      text: colors.slate[700],
    },
    ghost: {
      bg: 'transparent',
      hover: colors.slate[100],
      text: colors.slate[600],
    },
  },
  
  card: {
    bg: '#FFFFFF',
    border: colors.slate[200],
    shadow: shadows.sm,
    radius: borderRadius.lg,
  },
  
  input: {
    bg: '#FFFFFF',
    border: colors.slate[300],
    focus: colors.primary[500],
    text: colors.slate[900],
    placeholder: colors.slate[400],
  },
  
  badge: {
    critical: {
      bg: '#FEE2E2',
      text: '#991B1B',
    },
    high: {
      bg: '#FFEDD5',
      text: '#9A3412',
    },
    medium: {
      bg: '#FEF9C3',
      text: '#854D0E',
    },
    low: {
      bg: '#DCFCE7',
      text: '#166534',
    },
  },
};

// Helper functions
export const getRiskColor = (level: string): string => {
  const normalized = level?.toLowerCase();
  return colors.risk[normalized as keyof typeof colors.risk] || colors.slate[400];
};

export const getCategoryColor = (type: string): string => {
  if (['phone', 'email', 'address', 'whatsapp', 'telegram'].includes(type)) return colors.category.contact;
  if (['account', 'upi', 'card', 'ifsc', 'transaction_id'].includes(type)) return colors.category.financial;
  if (['person', 'aadhaar', 'pan', 'passport', 'voter_id'].includes(type)) return colors.category.identity;
  if (['ip', 'domain', 'url', 'email_header'].includes(type)) return colors.category.network;
  if (['location', 'geohash', 'tower_id'].includes(type)) return colors.category.location;
  if (['imei', 'imsi', 'mac_address', 'device_serial'].includes(type)) return colors.category.device;
  if (['company', 'gstin', 'merchant_id'].includes(type)) return colors.category.business;
  return colors.category.other;
};

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    open: colors.info,
    investigation: colors.primary[500],
    closed: colors.success,
    archived: colors.slate[400],
  };
  return statusMap[status?.toLowerCase()] || colors.slate[400];
};

export const getPriorityColor = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    critical: colors.risk.critical,
    high: colors.risk.high,
    medium: colors.risk.medium,
    low: colors.risk.low,
  };
  return priorityMap[priority?.toLowerCase()] || colors.slate[400];
};

