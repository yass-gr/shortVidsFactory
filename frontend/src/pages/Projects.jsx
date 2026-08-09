import { useEffect, useState } from 'react'
import { listProjects } from '../api.js'

export default function Projects({ onNavigate }) {
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    try {
      const data = await listProjects()
      setProjects(data.projects)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main>
      <h2>Projects</h2>
      <a href="#/new">New project</a>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {projects === null && !error && <p>Loading…</p>}
      {projects && projects.length === 0 && <p>No projects yet.</p>}
      {projects && projects.length > 0 && (
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button type="button" onClick={() => onNavigate(`/project/${p.id}/editor`)}>
                Continue
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}