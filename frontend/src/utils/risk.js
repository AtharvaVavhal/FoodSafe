// Single source of truth for risk level styling and labels.
// All risk-related colors in the app derive from here.

export const RISK_CONFIG = {
  SAFE: {
    label: 'Safe to Consume',
    shortLabel: 'Safe',
    icon: '✓',
    bannerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    scoreClass: 'text-emerald-600',
    barClass: 'bg-emerald-500',
    dotClass: 'bg-emerald-500',
  },
  MODERATE: {
    label: 'Moderate Risk',
    shortLabel: 'Moderate',
    icon: '⚠',
    bannerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    scoreClass: 'text-amber-600',
    barClass: 'bg-amber-500',
    dotClass: 'bg-amber-500',
  },
  UNSAFE: {
    label: 'High Risk — Avoid',
    shortLabel: 'Unsafe',
    icon: '✕',
    bannerClass: 'bg-red-50 border-red-200 text-red-800',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    scoreClass: 'text-red-600',
    barClass: 'bg-red-500',
    dotClass: 'bg-red-500',
  },
  CRITICAL: {
    label: 'Critical — Stop Use Immediately',
    shortLabel: 'Critical',
    icon: '✕',
    bannerClass: 'bg-red-100 border-red-300 text-red-900',
    badgeClass: 'bg-red-100 text-red-900 border border-red-300',
    scoreClass: 'text-red-800',
    barClass: 'bg-red-700',
    dotClass: 'bg-red-700',
  },
}

/** @param {string} level */
export function getRiskConfig(level) {
  return RISK_CONFIG[level?.toUpperCase()] ?? RISK_CONFIG.MODERATE
}
