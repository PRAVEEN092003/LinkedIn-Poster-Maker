import apiClient from './client'

/**
 * Map user-facing options to backend accepted enum values.
 */
const CONTENT_TYPE_MAP = {
  Internship: 'Internship',
  Achievement: 'Achievement',
  Project: 'Project',
  'Job Update': 'Achievement',
  Certificate: 'Learning',
  'Professional Announcement': 'General',
  Learning: 'Learning',
  General: 'General',
}

const TONE_MAP = {
  Professional: 'Professional',
  Friendly: 'Casual',
  Confident: 'Professional',
  Motivational: 'Inspirational',
  Casual: 'Casual',
  Inspirational: 'Inspirational',
  Storytelling: 'Storytelling',
}

/**
 * Generate LinkedIn post content via AI.
 * @param {object} params
 * @param {string} params.topic
 * @param {string} params.content_type
 * @param {string} params.tone
 * @param {string} params.length
 * @returns {Promise<{ success: boolean, data: { headline: string, caption: string, hashtags: string[], poster_text: string }, source?: string }>}
 */
export async function generateContentApi({ topic, content_type = 'General', tone = 'Professional', length = 'Medium' }) {
  const payload = {
    topic: topic.trim(),
    content_type: CONTENT_TYPE_MAP[content_type] || 'General',
    tone: TONE_MAP[tone] || 'Professional',
    length: length || 'Medium',
  }

  const response = await apiClient.post('/ai/generate', payload)
  return response.data
}
