import { useState } from 'react'
import Projects from './pages/Projects.jsx'
import Upload from './pages/Upload.jsx'

const findProjectRoute = (route) => {
  const m = route.match(/^\/project\/([^/]+)\/(scripts|editor)$/)
  return m ? { projectId: m[1], page: m[2] } : null
}

function ComingSoon({ title, projectId }) {
  return (
    <main>
      <h2>{title}</h2>
      <p>Coming soon (project {projectId}).</p>
    </main>
  )
}

export default function App({ initialRoute = '/' }) {
  const [route, setRoute] = useState(initialRoute)

  function navigate(next) {
    setRoute(next)
  }

  const projectRoute = findProjectRoute(route)

  let page
  if (route === '/new') {
    page = <Upload onNavigate={navigate} />
  } else if (projectRoute && projectRoute.page === 'scripts') {
    page = <ComingSoon title="Scripts" projectId={projectRoute.projectId} />
  } else if (projectRoute && projectRoute.page === 'editor') {
    page = <ComingSoon title="Editor" projectId={projectRoute.projectId} />
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