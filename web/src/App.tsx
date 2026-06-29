import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Article from './pages/Article'
import Nav from './components/Nav'

function WithNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2]">
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 py-6 text-center text-stone-400 text-sm">
        <span className="text-zinc-600">DeepFocus</span>
        <span className="mx-2 text-stone-300">·</span>
        <a
          href="https://github.com/rajdeep-singha/DeepFocus/blob/main/.github/ISSUE_TEMPLATE/content-request.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-600 transition-colors"
        >
          request content
        </a>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing — no nav, fullscreen */}
        <Route path="/" element={<Landing />} />

        {/* Main app — with nav + footer */}
        <Route
          path="/browse"
          element={
            <WithNav>
              <Home />
            </WithNav>
          }
        />
        <Route
          path="/read/:slug"
          element={
            <WithNav>
              <Article />
            </WithNav>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
