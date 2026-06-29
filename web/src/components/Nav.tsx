import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#faf7f2]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/browse"
          className=" font-semibold text-zinc-800 tracking-tight hover:text-violet-600 transition-colors"
        >
          DeepFocus 
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-500">
          <Link to="/browse" className="hover:text-zinc-700 transition-colors">browse</Link>
          <a
            href="https://github.com/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 transition-colors"
          >
            request
          </a>
        </nav>
      </div>
    </header>
  )
}
