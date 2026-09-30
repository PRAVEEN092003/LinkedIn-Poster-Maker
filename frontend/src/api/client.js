import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Handle 401 unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid token if the request was to a protected endpoint
      const isAuthEndpoint = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register')
      if (!isAuthEndpoint) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
