/**
 * Base card. Handles white surface, border, and optional press state.
 * Children manage their own padding via the `className` prop.
 */
export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white border border-stone-200 rounded-2xl shadow-sm',
        onClick ? 'cursor-pointer active:bg-stone-50 transition-colors duration-100' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
