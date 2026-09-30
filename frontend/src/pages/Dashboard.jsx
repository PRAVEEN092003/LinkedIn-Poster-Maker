import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import PosterPreview from '../components/PosterPreview'
import { getPostersApi } from '../api/posters'

export default function Dashboard() {
  const { user, navigateTo } = useAuth()
  const [recentPosters, setRecentPosters] = useState([])
  const [isLoadingPosters, setIsLoadingPosters] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchRecentPosters() {
      setIsLoadingPosters(true)
      try {
        const res = await getPostersApi()
        if (isMounted && res.success && res.posters) {
          // Take only the latest 3 posters
          setRecentPosters(res.posters.slice(0, 3))
        }
      } catch (err) {
        // Dashboard should still work gracefully if poster loading fails
        console.error('Error fetching recent posters for dashboard:', err)
      } finally {
        if (isMounted) {
          setIsLoadingPosters(false)
        }
      }
    }

    fetchRecentPosters()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Welcome Section & Primary Actions */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
              Welcome back, {user?.name || 'Creator'}
            </h1>
            <p className="text-sm text-zinc-400">
              Generate AI-powered LinkedIn content and design impactful posters for your audience.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigateTo('/create-post')}
              className="inline-flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors duration-150 shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create LinkedIn Post</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/create-poster')}
              className="inline-flex items-center justify-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors duration-150 cursor-pointer"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Create Poster</span>
            </button>
          </div>
        </section>

        {/* Recent Posters Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Recent Posters</h2>
              <p className="text-xs text-zinc-400">Your latest visual poster drafts and designs</p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('/my-posters')}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>View All Posters</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {isLoadingPosters ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading recent posters...</div>
          ) : recentPosters.length === 0 ? (
            /* Clean Empty State */
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-200">No posters yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Create your first LinkedIn poster.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('/create-poster')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Create Poster</span>
              </button>
            </div>
          ) : (
            /* Latest 3 Posters Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {recentPosters.map((poster) => (
                <div
                  key={poster.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
                >
                  <div className="p-3 bg-zinc-950/80 flex items-center justify-center border-b border-zinc-800/80">
                    <PosterPreview
                      posterData={poster.poster_data}
                      width={180}
                      height={180}
                      className="border border-zinc-800/80 shadow-md"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-semibold text-xs text-zinc-100 truncate" title={poster.title}>
                        {poster.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(poster.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('/create-poster', { posterId: poster.id })}
                      className="text-xs px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
