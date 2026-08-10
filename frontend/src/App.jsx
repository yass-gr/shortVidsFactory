import { useEffect, useState } from 'react'
import Projects from './pages/Projects.jsx'
import Scripts from './pages/Scripts.jsx'
import Upload from './pages/Upload.jsx'
import Editor from './pages/Editor.jsx'

const findProjectRoute = (route) => {
  const m = route.match(/^\/project\/([^/]+)\/(scripts|editor)$/)
  return m ? { projectId: m[1], page: m[2] } : null
}

const routeFromHash = () => {
  const hash = window.location.hash
  return hash && hash.length > 1 ? hash.slice(1) : '/'
}

export default function App({ initialRoute = '/' }) {
  const [route, setRoute] = useState(() => {
    const fromHash = routeFromHash()
    return window.location.hash && window.location.hash.length > 1 ? fromHash : initialRoute
  })

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(next) {
    window.location.hash = next
    setRoute(next)
  }

  const projectRoute = findProjectRoute(route)

  let page
  if (route === '/new') {
    page = <Upload onNavigate={navigate} />
  } else if (projectRoute && projectRoute.page === 'scripts') {
    page = <Scripts projectId={projectRoute.projectId} navigate={navigate} />
  } else if (projectRoute && projectRoute.page === 'editor') {
    page = <Editor projectId={projectRoute.projectId} />
  } else {
    page = <Projects onNavigate={navigate} />
  }

  return (
    <div>
      <h1>ShortVidsFactory</h1>
      {page}
    </div>
  )
}
