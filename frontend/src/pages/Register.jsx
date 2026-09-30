import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import Button from '../components/Button'
import Alert from '../components/Alert'

export default function Register() {
  const { register, navigateTo } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (!cleanName) {
      setError('Full name is required')
      return
    }

    if (!cleanEmail) {
      setError('Email address is required')
      return
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await register(cleanName, cleanEmail, password)
      setSuccess('Account created successfully! Redirecting...')
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to complete registration. Please try again.'
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
            Create an account
          </h1>
          <p className="text-xs text-zinc-400">
            Get started with PostCraft to design LinkedIn content with AI.
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <Alert type="error" message={error} onClose={() => setError('')} />
          <Alert type="success" message={success} onClose={() => setSuccess('')} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="register-name"
              label="Full name"
              type="text"
              placeholder="Alex Smith"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="name"
              disabled={isLoading}
            />

            <Input
              id="register-email"
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
              id="register-password"
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />

            <Input
              id="register-confirm-password"
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError('')
              }}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="mt-2"
            >
              Create account
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigateTo('/login')}
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
