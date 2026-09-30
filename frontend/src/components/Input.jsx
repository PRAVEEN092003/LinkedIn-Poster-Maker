import { useState } from 'react'

export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error = '',
  autoComplete,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-zinc-300"
        >
          {label} {required && <span className="text-violet-400">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type={actualType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 text-sm placeholder-zinc-500 border ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30'
          } outline-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
            isPassword ? 'pr-14' : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors duration-150 px-1 py-0.5 rounded cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
