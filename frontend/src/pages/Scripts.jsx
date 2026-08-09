import { useEffect, useState } from 'react'
import { approveScript, generateScripts, getScripts, pollJob } from '../api.js'

export default function Scripts({ projectId, navigate }) {
  const [scripts, setScripts] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [approvingId, setApprovingId] = useState(null)

  useEffect(() => {
    let source = null
    let cancelled = false
    setScripts(null)
    setError(null)

    async function load() {
      try {
        const data = await getScripts(projectId)
        if (cancelled) return
        if (Array.isArray(data)) {
          setScripts(data)
          return
        }
        let jobId = data?.pending
        if (!jobId) {
          const { job_id } = await generateScripts(projectId)
          if (cancelled) return
          jobId = job_id
        }
        source = pollJob(jobId, (job) => {
          if (cancelled) return
          if (job?.status === 'done') {
            source?.close()
            setScripts(job?.result ?? [])
          } else if (job?.status === 'error') {
            source?.close()
            setError(job?.error || 'Script generation failed')
          }
        })
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    load()
    return () => {
      cancelled = true
      source?.close()
    }
  }, [projectId, attempt])

  async function handleUse(script) {
    setApprovingId(script.id)
    try {
      await approveScript(projectId, script.id)
      navigate(`/project/${projectId}/editor`)
    } catch (err) {
      setError(err.message)
    } finally {
      setApprovingId(null)
    }
  }

  function retry() {
    setAttempt((a) => a + 1)
  }

  return (
    <main>
      <h2>Choose a script</h2>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      {scripts === null && !error && <p>Loading…</p>}
      {scripts && scripts.length === 0 && !error && <p>No scripts yet.</p>}
      {scripts && scripts.length > 0 && (
        <ul>
          {scripts.map((s) => (
            <li key={s.id}>
              <h3>{s.hook}</h3>
              <p>{s.summary}</p>
              <p>
                {s.words_used} words · {Math.round(s.duration_s)}s
              </p>
              <button
                type="button"
                onClick={() => handleUse(s)}
                disabled={approvingId !== null}
              >
                {approvingId === s.id ? 'Approving…' : 'Use this'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}