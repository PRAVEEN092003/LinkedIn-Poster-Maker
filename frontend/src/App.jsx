import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import CreatePoster from './pages/CreatePoster'
import MyPosters from './pages/MyPosters'
import ProtectedRoute from './components/ProtectedRoute'

function AppRoutes() {
  const { currentPath, isAuthenticated, isLoading, navigateTo } = useAuth()

  // Redirect authenticated users away from /login and /register
  useEffect(() => {
    if (!isLoading && isAuthenticated && (currentPath === '/login' || currentPath === '/register')) {
      navigateTo('/dashboard')
    }
  }, [isLoading, isAuthenticated, currentPath, navigateTo])

  if (currentPath === '/register') {
    return <Register />
  }

  if (currentPath === '/login') {
    return <Login />
  }

  if (currentPath === '/create-post') {
    return (
      <ProtectedRoute>
        <CreatePost />
      </ProtectedRoute>
    )
  }

  if (currentPath === '/create-poster') {
    return (
      <ProtectedRoute>
        <CreatePoster />
      </ProtectedRoute>
    )
  }

  if (currentPath === '/my-posters') {
    return (
      <ProtectedRoute>
        <MyPosters />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
