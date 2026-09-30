import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import Button from '../components/Button'
import Alert from '../components/Alert'

export default function Login() {
  const { login, navigateTo } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Email address is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    try {
      await login(cleanEmail, password)
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to connect to server. Please check your connection and try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-xl bg-violet-600 items-center justify-center font-bold text-white text-base shadow-sm">
            P
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Sign in to PostCraft
          </h1>
          <p className="text-xs text-zinc-400">
            Welcome back! Enter your details to access your dashboard.
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="email"
              disabled={isLoading}
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-zinc-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigateTo('/register')}
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  )
}
