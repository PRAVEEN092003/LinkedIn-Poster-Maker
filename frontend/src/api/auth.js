import apiClient from './client'

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ message: string, token: string, user: object }>}
 */
export async function loginApi(email, password) {
  const response = await apiClient.post('/auth/login', { email, password })
  return response.data
}

/**
 * Register a new user account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ message: string, token: string, user: object }>}
 */
export async function registerApi(name, email, password) {
  const response = await apiClient.post('/auth/register', { name, email, password })
  return response.data
}

/**
 * Fetch the currently authenticated user's profile.
 * @returns {Promise<{ user: object }>}
 */
export async function getMeApi() {
  const response = await apiClient.get('/auth/me')
  return response.data
}
