import { forwardRef } from 'react'

/**
 * Text input with optional label, error message, and right-side slot.
 */
const Input = forwardRef(function Input(
  { label, placeholder, value, onChange, onKeyDown, type = 'text', error, right, className = '' },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-stone-700">{label}</label>
      )}

      <div className="relative flex items-center">
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={[
            'w-full h-[52px] pl-4 text-[15px] text-stone-900 bg-white',
            'border rounded-xl placeholder-stone-400',
            'transition-colors duration-100',
            'focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-0 focus:border-transparent',
            error ? 'border-red-300 focus:ring-red-500' : 'border-stone-300',
            right ? 'pr-12' : 'pr-4',
          ].filter(Boolean).join(' ')}
        />
        {right && (
          <div className="absolute right-3 flex items-center text-stone-400">
            {right}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  )
})

export default Input
