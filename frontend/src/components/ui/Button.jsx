const VARIANTS = {
  primary:   'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950',
  secondary: 'bg-white text-stone-900 border border-stone-300 hover:bg-stone-50 active:bg-stone-100',
  ghost:     'text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200',
}

const SIZES = {
  sm: 'h-9 px-4 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-[52px] px-6 text-[15px] rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-100 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  )
}
