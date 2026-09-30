import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginApi, registerApi, getMeApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [isLoading, setIsLoading] = useState(true)

  // Current page path state synced with browser history
  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname
    if (path === '/register') return '/register'
    if (path === '/login') return '/login'
    if (path === '/create-post') return '/create-post'
    if (path === '/create-poster') return '/create-poster'
    if (path === '/my-posters') return '/my-posters'
    return '/dashboard'
  })

  const [navigationState, setNavigationState] = useState(null)

  const navigateTo = useCallback((path, state = null) => {
    if (state !== undefined) {
      setNavigationState(state)
      try {
        if (state !== null) {
          sessionStorage.setItem('nav_state_' + path, JSON.stringify(state))
        } else {
          sessionStorage.removeItem('nav_state_' + path)
        }
      } catch {}
    }
    if (window.location.pathname !== path) {
      window.history.pushState(state, '', path)
    }
    setCurrentPath(path)
  }, [])

  const getNavigationState = useCallback((path) => {
    if (navigationState) return navigationState
    try {
      const stored = sessionStorage.getItem('nav_state_' + path)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [navigationState])

  const clearNavigationState = useCallback((path) => {
    setNavigationState(null)
    try {
      sessionStorage.removeItem('nav_state_' + path)
    } catch {}
  }, [])

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = (e) => {
      const path = window.location.pathname
      setNavigationState(e.state || null)
      if (path === '/register') setCurrentPath('/register')
      else if (path === '/login') setCurrentPath('/login')
      else if (path === '/create-post') setCurrentPath('/create-post')
      else if (path === '/create-poster') setCurrentPath('/create-poster')
      else if (path === '/my-posters') setCurrentPath('/my-posters')
      else setCurrentPath('/dashboard')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Handle unauthorized event from axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigateTo('/login')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [navigateTo])

  // Validate existing token with /api/auth/me on initial load
  useEffect(() => {
    let isMounted = true

    async function checkAuth() {
      const savedToken = localStorage.getItem('token')
      if (!savedToken) {
        if (isMounted) {
          setUser(null)
          setToken(null)
          setIsLoading(false)
        }
        return
      }

      try {
        const data = await getMeApi()
        if (isMounted && data.user) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      } catch {
        if (isMounted) {
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (email, password) => {
    const data = await loginApi(email, password)
    if (data.token && data.user) {
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigateTo('/dashboard')
    }
    return data
  }

  const register = async (name, email, password) => {
    const data = await registerApi(name, email, password)
    if (data.token && data.user) {
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigateTo('/dashboard')
    }
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigateTo('/login')
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    currentPath,
    navigateTo,
    getNavigationState,
    clearNavigationState,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
