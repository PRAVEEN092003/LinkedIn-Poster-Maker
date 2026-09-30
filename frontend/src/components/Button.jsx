export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
}) {
  const baseStyles =
    'w-full inline-flex items-center justify-center font-medium text-sm rounded-lg px-4 py-2.5 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    primary:
      'bg-violet-600 hover:bg-violet-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2 focus:ring-offset-zinc-950',
    secondary:
      'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-zinc-600/40 focus:ring-offset-2 focus:ring-offset-zinc-950',
    outline:
      'bg-transparent hover:bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600/40',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
