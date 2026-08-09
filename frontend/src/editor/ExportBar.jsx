import { useState } from 'react'
import { exportProject, pollJob, revealDirectory, saveSnapshot } from '../api.js'

function defaultDestination(exportPath) {
  if (exportPath) {
    const idx = exportPath.lastIndexOf('/')
    if (idx > 0) return exportPath.slice(0, idx)
  }
  return '/tmp'
}

export default function ExportBar({ projectId, snapshot, enabled, onExported }) {
  const [destination, setDestination] = useState(defaultDestination(snapshot.export_path))
  const [progress, setProgress] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const canExport = enabled && !exporting && destination.trim() !== ''

  function handleExport() {
    if (!canExport) return
    setExporting(true)
    setDone(false)
    setError(null)
    setProgress(0)
    saveSnapshot(projectId, snapshot)
      .then(() => exportProject(projectId, destination.trim()))
      .then(({ job_id }) => {
        pollJob(job_id, (data) => {
          setProgress(data.progress || 0)
          if (data.status === 'done') {
            setExporting(false)
            setDone(true)
            onExported?.(data?.result?.path)
          } else if (data.status === 'error') {
            setExporting(false)
            setError(data.error || 'Export failed')
          }
        })
      })
      .catch((err) => {
        setExporting(false)
        setError(err.message)
      })
  }

  return (
    <section>
      <h3>Export</h3>
      <label>
        Destination folder
        <input
          data-testid="export-destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </label>
      <button type="button" data-testid="export-button" onClick={handleExport} disabled={!canExport}>
        Export
      </button>
      {exporting && (
        <div style={{ marginTop: 8 }}>
          <progress data-testid="export-progress" max={1} value={progress} />
          <span style={{ marginLeft: 8 }}>{Math.round(progress * 100)}%</span>
        </div>
      )}
      {done && <p data-testid="export-success">Export complete</p>}
      {done && (
        <button type="button" data-testid="open-folder" onClick={() => revealDirectory(projectId)}>
          Open folder
        </button>
      )}
      {error && <p data-testid="export-error">{error}</p>}
      {error && (
        <button type="button" data-testid="export-retry" onClick={handleExport}>
          Retry
        </button>
      )}
    </section>
  )
}
