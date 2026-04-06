import { getRiskConfig } from '../../utils/risk'

/**
 * Risk-level badge. Pass `risk` prop (SAFE/MODERATE/UNSAFE/CRITICAL)
 * and optionally override the displayed label.
 */
export default function Badge({ risk, label, size = 'md' }) {
  const config = getRiskConfig(risk)

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5'
      : 'text-xs px-2.5 py-1'

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClass,
        config.badgeClass,
      ].join(' ')}
    >
      <span aria-hidden="true">{config.icon}</span>
      {label ?? config.shortLabel}
    </span>
  )
}
