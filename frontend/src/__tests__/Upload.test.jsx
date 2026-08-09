import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Upload from '../pages/Upload.jsx'
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

describe('Upload', () => {
  it('navigates to scripts page after successful upload', async () => {
    api.createProject.mockResolvedValue({ id: 'p1', name: 'demo' })
    api.uploadVideo.mockResolvedValue({ project_id: 'p1', job_id: 'j1', media: {} })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1 })
      return { close: vi.fn() }
    })
    const navigate = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onNavigate={navigate} />)
    const input = container.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { value: [file] })
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input)
    fireEvent.click(screen.getByRole('button', { name: /create|upload/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/project/p1/scripts')
    })
  })

  it('creates the project first with the provided name', async () => {
    api.createProject.mockResolvedValue({ id: 'p2', name: 'my project' })
    api.uploadVideo.mockResolvedValue({ project_id: 'p2', job_id: 'j2', media: {} })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1 })
      return { close: vi.fn() }
    })
    const navigate = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onNavigate={navigate} />)
    const input = container.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { value: [file] })
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'my project' } })
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(api.createProject).toHaveBeenCalledWith('my project')
      expect(api.uploadVideo).toHaveBeenCalledWith('p2', file)
      expect(api.pollJob).toHaveBeenCalledWith('j2', expect.any(Function))
      expect(navigate).toHaveBeenCalledWith('/project/p2/scripts')
    })
  })
})