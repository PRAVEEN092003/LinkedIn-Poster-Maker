import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Alert from '../components/Alert'
import PosterPreview from '../components/PosterPreview'
import { getPostersApi, deletePosterApi } from '../api/posters'

export default function MyPosters() {
  const { navigateTo } = useAuth()
  const [posters, setPosters] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  // State for confirming deletion
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPosters = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await getPostersApi()
      if (res.success && res.posters) {
        setPosters(res.posters)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load your posters. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosters()
  }, [])

  const handleOpenPoster = (posterId) => {
    navigateTo('/create-poster', { posterId })
  }

  const handleDeletePoster = async (posterId) => {
    setIsDeleting(true)
    setError('')
    try {
      const res = await deletePosterApi(posterId)
      if (res.success) {
        setPosters((prev) => prev.filter((p) => p.id !== posterId))
        setNotification('Poster draft deleted successfully.')
        setTimeout(() => setNotification(''), 3000)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete poster.'
      setError(msg)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
              My Posters
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Manage, edit, and export your saved LinkedIn poster drafts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('/create-poster')}
            className="inline-flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors duration-150 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Poster</span>
          </button>
        </div>

        {/* Feedback Banners */}
        <Alert type="error" message={error} onClose={() => setError('')} />
        {notification && (
          <div className="p-3 rounded-lg text-xs bg-emerald-950/60 border border-emerald-900/80 text-emerald-300">
            {notification}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex items-center space-x-2 text-zinc-400 text-xs">
              <svg
                className="animate-spin h-4 w-4 text-violet-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading saved posters...</span>
            </div>
          </div>
        ) : posters.length === 0 ? (
          /* Empty State */
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">No posters yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Create and save your first professional LinkedIn poster draft to view and edit it here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/create-poster')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Create Poster</span>
            </button>
          </div>
        ) : (
          /* Posters Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((poster) => {
              const isConfirmingDelete = deletingId === poster.id

              return (
                <div
                  key={poster.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
                >
                  {/* Poster Preview */}
                  <div className="p-4 flex items-center justify-center bg-zinc-950/80 border-b border-zinc-800/80">
                    <PosterPreview
                      posterData={poster.poster_data}
                      width={220}
                      height={220}
                      className="border border-zinc-800/80 shadow-md"
                    />
                  </div>

                  {/* Poster Info & Metadata */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm text-zinc-100 line-clamp-1" title={poster.title}>
                          {poster.title}
                        </h3>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0">
                          {poster.template_name || 'Custom'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Created on {new Date(poster.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Card Actions */}
                    {isConfirmingDelete ? (
                      <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 space-y-2">
                        <p className="text-[11px] text-red-300 font-medium">Delete this poster draft?</p>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDeletePoster(poster.id)}
                            disabled={isDeleting}
                            className="text-xs px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            disabled={isDeleting}
                            className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => handleOpenPoster(poster.id)}
                          className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Open / Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingId(poster.id)}
                          title="Delete poster draft"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-300 border border-zinc-800 hover:border-red-900/60 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
