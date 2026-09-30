import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Alert from '../components/Alert'
import { generateContentApi } from '../api/ai'

const CONTENT_TYPES = [
  'Internship',
  'Achievement',
  'Project',
  'Job Update',
  'Certificate',
  'Professional Announcement',
]

const TONES = [
  'Professional',
  'Friendly',
  'Confident',
  'Motivational',
]

const LENGTHS = [
  { label: 'Short (60–80 words)', value: 'Short' },
  { label: 'Medium (120–150 words)', value: 'Medium' },
  { label: 'Long (200–250 words)', value: 'Long' },
]

export default function CreatePost() {
  const { navigateTo } = useAuth()

  // Form state
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('Achievement')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('Medium')

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [posterNotification, setPosterNotification] = useState('')

  const handleGenerate = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setPosterNotification('')

    const cleanTopic = topic.trim()
    if (!cleanTopic) {
      setError('Please enter a topic or description for your post.')
      return
    }

    if (cleanTopic.length > 300) {
      setError('Topic must be 300 characters or fewer.')
      return
    }

    setIsLoading(true)

    try {
      const res = await generateContentApi({
        topic: cleanTopic,
        content_type: contentType,
        tone,
        length,
      })

      if (res.success && res.data) {
        setResult(res)
      } else {
        setError(res.message || 'Failed to generate content. Please try again.')
      }
    } catch (err) {
      const serverError = err.response?.data
      if (err.response?.status === 429) {
        setError('AI rate limit reached. Please wait a moment before trying again.')
      } else if (err.response?.status === 503) {
        setError(serverError?.message || 'AI service is temporarily unavailable. Please try again shortly.')
      } else if (serverError?.message) {
        setError(serverError.message)
      } else {
        setError('Network error or AI service unreachable. Please check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCaption = async () => {
    if (!result?.data?.caption) return
    try {
      await navigator.clipboard.writeText(result.data.caption)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = result.data.caption
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    }
  }

  const handleCopyHashtags = async () => {
    if (!result?.data?.hashtags) return
    const tagsText = Array.isArray(result.data.hashtags)
      ? result.data.hashtags.join(' ')
      : result.data.hashtags

    try {
      await navigator.clipboard.writeText(tagsText)
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = tagsText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    }
  }

  const getSourceBadgeStyle = (source) => {
    const s = String(source || '').toLowerCase()
    if (s === 'cache') {
      return 'bg-violet-950/60 text-violet-300 border-violet-800/70'
    }
    if (s === 'fallback') {
      return 'bg-amber-950/60 text-amber-300 border-amber-800/70'
    }
    return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70'
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigateTo('/dashboard')}
                className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-150 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Dashboard</span>
              </button>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="text-xs text-violet-400 font-medium">Create Post</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              LinkedIn AI Content Generator
            </h1>
          </div>
        </div>

        {/* Form Card */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5">
          <Alert type="error" message={error} onClose={() => setError('')} />
          {posterNotification && (
            <Alert type="success" message={posterNotification} onClose={() => setPosterNotification('')} />
          )}

          <form onSubmit={handleGenerate} className="space-y-5" noValidate>
            {/* Topic Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="topic-input"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Topic or Key Points <span className="text-violet-400">*</span>
                </label>
                <span
                  className={`text-xs ${
                    topic.length > 280 ? 'text-amber-400 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {topic.length}/300
                </span>
              </div>

              <textarea
                id="topic-input"
                rows="4"
                maxLength={300}
                placeholder="e.g., Completed a 6-month full-stack engineering internship, built a scalable real-time analytics dashboard, and learned modern system design..."
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value)
                  if (error) setError('')
                }}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 text-sm placeholder-zinc-500 border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-colors duration-150 resize-none disabled:opacity-50"
              />
            </div>

            {/* Select Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Content Type */}
              <div className="space-y-1.5">
                <label
                  htmlFor="content-type-select"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Content Type
                </label>
                <select
                  id="content-type-select"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-sm border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-colors cursor-pointer"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-zinc-900 text-zinc-100">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label
                  htmlFor="tone-select"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Tone
                </label>
                <select
                  id="tone-select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-sm border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-colors cursor-pointer"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t} className="bg-zinc-900 text-zinc-100">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Length */}
              <div className="space-y-1.5">
                <label
                  htmlFor="length-select"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Caption Length
                </label>
                <select
                  id="length-select"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-sm border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-colors cursor-pointer"
                >
                  {LENGTHS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-zinc-900 text-zinc-100">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!topic.trim()}
                className="w-full sm:w-auto px-6"
              >
                <span className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-violet-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Generate with AI</span>
                </span>
              </Button>
            </div>
          </form>
        </section>

        {/* Results Section */}
        {result?.data && (
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-6">
            {/* Header & Source Badge */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-semibold text-zinc-100">
                  Generated Result
                </h2>
                {result.source && (
                  <span
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getSourceBadgeStyle(
                      result.source
                    )}`}
                  >
                    Source: {result.source.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isLoading}
                  className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Headline
              </span>
              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-semibold text-zinc-100">
                {result.data.headline}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Caption
                </span>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedCaption ? 'Copied to clipboard!' : 'Copy Caption'}</span>
                </button>
              </div>
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {result.data.caption}
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Hashtags
                </span>
                <button
                  type="button"
                  onClick={handleCopyHashtags}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedHashtags ? 'Copied!' : 'Copy Hashtags'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(result.data.hashtags)
                  ? result.data.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-md bg-zinc-950 text-violet-300 border border-zinc-800 font-mono font-medium"
                      >
                        {tag}
                      </span>
                    ))
                  : (
                      <span className="text-xs text-zinc-300">
                        {result.data.hashtags}
                      </span>
                    )}
              </div>
            </div>

            {/* Poster Text */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Poster Text (Visual Punchline)
              </span>
              <div className="p-4 rounded-lg bg-zinc-950 border border-violet-900/40 text-sm font-medium text-violet-200 italic">
                "{result.data.poster_text}"
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-colors cursor-pointer"
                >
                  {copiedCaption ? '✓ Caption Copied' : 'Copy Full Caption'}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigateTo('/create-poster', {
                    headline: result.data.headline,
                    poster_text: result.data.poster_text,
                    caption: result.data.caption,
                    hashtags: result.data.hashtags,
                    content_type: contentType,
                    tone: tone,
                  })
                }
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Create Poster</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
