import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Scripts from '../pages/Scripts.jsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  createProject: vi.fn(),
  uploadVideo: vi.fn(),
  pollJob: vi.fn(),
  listProjects: vi.fn(),
  generateScripts: vi.fn(),
  getScripts: vi.fn(),
  approveScript: vi.fn(),
  getSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  exportProject: vi.fn(),
  getMusic: vi.fn(),
}))

const SCRIPTS = [
  { id: 's1', hook: 'Hook one', summary: 'Summary one', words_used: 30, duration_s: 15.0 },
  { id: 's2', hook: 'Hook two', summary: 'Summary two', words_used: 42, duration_s: 20.5 },
  { id: 's3', hook: 'Hook three', summary: 'Summary three', words_used: 18, duration_s: 12.0 },
]

function renderScripts(props = {}) {
  return render(<Scripts projectId="p1" navigate={vi.fn()} {...props} />)
}

describe('Scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading then renders cards when scripts are already saved', async () => {
    api.getScripts.mockResolvedValue(SCRIPTS)
    renderScripts()
    expect(screen.getByText('Loading…')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('Hook one')).toBeTruthy()
      expect(screen.getByText('Summary one')).toBeTruthy()
      expect(screen.getByText('Hook two')).toBeTruthy()
      expect(screen.getByText('Hook three')).toBeTruthy()
    })
    expect(screen.getAllByRole('button', { name: /use this/i })).toHaveLength(3)
    expect(api.generateScripts).not.toHaveBeenCalled()
    expect(api.pollJob).not.toHaveBeenCalled()
  })

  it('generates scripts and polls the job when none are saved yet', async () => {
    api.getScripts.mockResolvedValue({ pending: null })
    api.generateScripts.mockResolvedValue({ job_id: 'j1' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() }
    })
    renderScripts()

    await waitFor(() => {
      expect(api.generateScripts).toHaveBeenCalledWith('p1')
      expect(api.pollJob).toHaveBeenCalledWith('j1', expect.any(Function))
    })
    await waitFor(() => expect(screen.getByText('Hook two')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: /use this/i })).toHaveLength(3)
  })

  it('reuses a pending job id from getScripts without regenerating', async () => {
    api.getScripts.mockResolvedValue({ pending: 'existing-job' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() }
    })
    renderScripts()

    await waitFor(() => {
      expect(api.generateScripts).not.toHaveBeenCalled()
      expect(api.pollJob).toHaveBeenCalledWith('existing-job', expect.any(Function))
    })
    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
  })

  it('approves the chosen script and navigates to the editor', async () => {
    const navigate = vi.fn()
    api.getScripts.mockResolvedValue(SCRIPTS)
    api.approveScript.mockResolvedValue({ cuts: [] })
    renderScripts({ navigate })

    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /use this/i })[1])

    await waitFor(() => {
      expect(api.approveScript).toHaveBeenCalledWith('p1', 's2')
      expect(navigate).toHaveBeenCalledWith('/project/p1/editor')
    })
  })

  it('recovers from an errored pending job via Retry by regenerating', async () => {
    api.getScripts.mockResolvedValueOnce({ pending: 'old-errored-job' })
    api.getScripts.mockResolvedValue({ pending: null })
    api.generateScripts.mockResolvedValue({ job_id: 'j3' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      if (jobId === 'old-errored-job') {
        onProgress({ status: 'error', progress: 1, error: 'Script generation failed' })
      } else {
        onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      }
      return { close: vi.fn() }
    })
    renderScripts()

    await waitFor(() => {
      expect(api.pollJob).toHaveBeenCalledWith('old-errored-job', expect.any(Function))
    })
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByText('Script generation failed')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    expect(api.generateScripts).toHaveBeenCalledWith('p1')
    expect(api.pollJob).toHaveBeenCalledWith('j3', expect.any(Function))
  })

  it('shows an error with a Retry that re-triggers generation', async () => {
    api.getScripts.mockRejectedValueOnce(new Error('network down'))
    api.getScripts.mockResolvedValue({ pending: null })
    api.generateScripts.mockResolvedValue({ job_id: 'j2' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() }
    })
    renderScripts()

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByText('network down')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    expect(api.generateScripts).toHaveBeenCalledWith('p1')
  })
})