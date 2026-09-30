import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, navigateTo } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigateTo('/login')
    }
  }, [isLoading, isAuthenticated, navigateTo])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-zinc-400 text-xs">
          <svg
            className="animate-spin h-4 w-4 text-violet-500"
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
          <span>Authenticating...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}
