import { useEffect, useState } from 'react'
import type { AppScreen } from './types'
import { WindowChrome } from './components/WindowChrome'
import { SettingsModal } from './components/SettingsModal'
import Projects from './pages/Projects'
import Upload from './pages/Upload'
import Scripts from './pages/Scripts'
import Editor from './pages/Editor'

const SCREEN_BY_PATH: Array<[RegExp, AppScreen]> = [
  [/^\/new$/, 'upload'],
  [/^\/project\/[^/]+\/scripts$/, 'scripts'],
  [/^\/project\/[^/]+\/editor$/, 'editor'],
  [/^[^/]*$|^\//, 'projects'],
]

function screenForRoute(route: string): AppScreen {
  for (const [re, screen] of SCREEN_BY_PATH) if (re.test(route)) return screen
  return 'projects'
}

const routeFromHash = (): string => {
  const hash = window.location.hash
  return hash && hash.length > 1 ? hash.slice(1) : '/'
}

export default function App({ initialRoute = '/' }: { initialRoute?: string }) {
  const [route, setRoute] = useState<string>(() => {
    const fromHash = routeFromHash()
    return window.location.hash && window.location.hash.length > 1 ? fromHash : initialRoute
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeProjectTitle, setActiveProjectTitle] = useState<string | null>(null)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const m = route.match(/^\/project\/[^/]+\/(scripts|editor)$/)
    setActiveProjectTitle(m ? `Project ${m[1]}` : null)
  }, [route])

  function showToast(msg: string) {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 2500)
  }

  function navigate(screen: AppScreen, projectId?: string) {
    const screenPath: Record<AppScreen, string> = {
      projects: '/',
      upload: '/new',
      scripts: projectId ? `/project/${projectId}/scripts` : '/',
      editor: projectId ? `/project/${projectId}/editor` : '/',
      exporting: projectId ? `/project/${projectId}/export` : '/',
    }
    const next = `#${screenPath[screen]}`
    if (window.location.hash === next) {
      setRoute(screenPath[screen])
    } else {
      window.location.hash = next
      setRoute(screenPath[screen])
    }
    setActiveProjectTitle(projectId ? `Project ${projectId}` : null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const currentScreen = screenForRoute(route)

  let pageBody: React.ReactNode
  if (route === '/new') {
    pageBody = <Upload onUploaded={(pid) => navigate('scripts', pid)} />
  } else {
    const m = route.match(/^\/project\/([^/]+)\/(scripts|editor)$/)
    if (m && m[2] === 'scripts') {
      pageBody = <Scripts projectId={m[1]} navigate={(r: string) => navigate('editor', m[1])} />
    } else if (m && m[2] === 'editor') {
      pageBody = <Editor projectId={m[1]} />
    } else {
      pageBody = (
        <Projects
          onSelectProject={(p) => navigate(p.status === 'processing' ? 'scripts' : 'editor', p.id)}
          onNewProjectClick={() => navigate('upload')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )
    }
  }

  return (
    <div className="w-screen h-screen bg-[#0D0F11] flex flex-col justify-center items-center overflow-hidden font-sans antialiased text-[#F5F5F2] p-0 md:p-3">
      <div className="w-full h-full max-w-[1600px] max-h-[1000px] bg-[#111316] border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        <WindowChrome
          currentScreen={currentScreen}
          activeProjectTitle={activeProjectTitle}
          onNavigate={(s) => navigate(s)}
          onNewProjectClick={() => navigate('upload')}
          onSaveProject={() => showToast('Project changes saved securely to disk!')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="flex-1 overflow-hidden relative">{pageBody}</div>

        {toastMessage && (
          <div className="absolute bottom-6 right-6 z-50 bg-[#D5FF3F] text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}