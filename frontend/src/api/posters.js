import apiClient from './client'

/**
 * Save a new poster draft to the database.
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.template_name]
 * @param {string|object} params.poster_data
 * @returns {Promise<{ success: boolean, message: string, poster: object }>}
 */
export async function createPosterApi({ title, template_name = 'custom', poster_data }) {
  const response = await apiClient.post('/posters', {
    title,
    template_name,
    poster_data,
  })
  return response.data
}

export const savePosterApi = createPosterApi

/**
 * Update an existing poster draft in the database.
 * @param {number|string} posterId
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} [params.template_name]
 * @param {string|object} [params.poster_data]
 * @returns {Promise<{ success: boolean, message: string, poster: object }>}
 */
export async function updatePosterApi(posterId, { title, template_name, poster_data }) {
  const response = await apiClient.put(`/posters/${posterId}`, {
    title,
    template_name,
    poster_data,
  })
  return response.data
}

/**
 * Delete an existing poster draft from the database.
 * @param {number|string} posterId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deletePosterApi(posterId) {
  const response = await apiClient.delete(`/posters/${posterId}`)
  return response.data
}

/**
 * Retrieve all saved poster drafts belonging to the authenticated user.
 * @returns {Promise<{ success: boolean, posters: Array<object> }>}
 */
export async function listPostersApi() {
  const response = await apiClient.get('/posters')
  return response.data
}

export const getPostersApi = listPostersApi

/**
 * Retrieve a specific poster draft by ID.
 * @param {number|string} posterId
 * @returns {Promise<{ success: boolean, poster: object }>}
 */
export async function getPosterApi(posterId) {
  const response = await apiClient.get(`/posters/${posterId}`)
  return response.data
}
