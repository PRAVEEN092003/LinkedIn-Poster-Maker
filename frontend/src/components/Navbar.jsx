import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout, currentPath, navigateTo } = useAuth()

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Create Post', path: '/create-post' },
    { label: 'My Posters', path: '/my-posters' },
  ]

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-none sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo & Navigation Links */}
        <div className="flex items-center space-x-6">
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className="flex items-center space-x-3 text-left cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-sm tracking-tight shadow-sm">
              P
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-zinc-100 text-base tracking-tight">
                PostCraft
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                AI Poster Maker
              </span>
            </div>
          </button>

          {/* Nav Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => navigateTo(link.path)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 text-violet-300 font-medium border border-zinc-700/60'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {link.label}
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Mobile Nav Links */}
            <div className="flex md:hidden items-center space-x-1">
              <button
                type="button"
                onClick={() => navigateTo('/create-post')}
                className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  currentPath === '/create-post'
                    ? 'bg-zinc-800 text-violet-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Post
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/my-posters')}
                className={`text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  currentPath === '/my-posters'
                    ? 'bg-zinc-800 text-violet-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Posters
              </button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-zinc-300">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-200">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline-block font-medium text-zinc-200">
                {user.name}
              </span>
            </div>

            <div className="h-4 w-px bg-zinc-800" />

            <button
              onClick={logout}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors duration-150 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
