export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null

  const isError = type === 'error'

  return (
    <div
      className={`w-full p-3 rounded-lg text-xs flex items-start justify-between border ${
        isError
          ? 'bg-red-950/40 text-red-300 border-red-900/60'
          : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60'
      }`}
    >
      <div className="flex items-start space-x-2">
        <span className="font-semibold text-xs leading-tight">
          {isError ? 'Error:' : 'Success:'}
        </span>
        <span className="leading-tight">{message}</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="text-zinc-400 hover:text-zinc-200 transition-colors ml-2 cursor-pointer"
        >
          &times;
        </button>
      )}
    </div>
  )
}
