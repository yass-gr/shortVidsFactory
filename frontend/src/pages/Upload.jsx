import { useState } from 'react'
import { createProject, pollJob, uploadVideo } from '../api.js'

export default function Upload({ onNavigate }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | processing | error | done
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  function handleFileChange(e) {
    setFile(e.target.files[0])
    setError(null)
  }

  function reset() {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setFile(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Please choose a video file first')
      return
    }
    setStatus('uploading')
    setProgress(0)
    setError(null)
    try {
      const project = await createProject(name.trim() || 'Untitled')
      const { job_id, project_id } = await uploadVideo(project.id, file)
      setStatus('processing')
      let source
      await new Promise((resolve, reject) => {
        source = pollJob(job_id, (data) => {
          if (data?.progress !== undefined) setProgress(data.progress)
          if (data?.status === 'done') {
            setProgress(1)
            source?.close()
            resolve()
          }
          if (data?.status === 'error') {
            source?.close()
            reject(new Error(data?.error || 'Processing failed'))
          }
        })
      })
      setStatus('done')
      onNavigate(`/project/${project_id}/scripts`)
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const isBusy = status === 'uploading' || status === 'processing'

  return (
    <main>
      <h2>New project</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="project-name">Project name</label>
        <input
          id="project-name"
          type="text"
          placeholder="Untitled"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isBusy}
        />
        <label htmlFor="video-file">Video file</label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={isBusy}
        />
        <button type="submit" disabled={isBusy || status === 'done'}>
          Upload
        </button>
      </form>

      {isBusy && (
        <div role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div
            style={{ width: `${Math.round(progress * 100)}%` }}
            data-testid="progress-bar"
          />
          {Math.round(progress * 100)}%
        </div>
      )}

      {status === 'error' && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={reset}>
            Retry
          </button>
        </div>
      )}
    </main>
  )
}