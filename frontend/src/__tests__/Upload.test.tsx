import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Upload from '../pages/Upload.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  createProject: vi.fn(),
  uploadVideo: vi.fn(),
  pollJob: vi.fn(),
  getSnapshot: vi.fn(),
}))

const apiMock = vi.mocked(api)

describe('Upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a project, uploads the picked file, then reports the project id', async () => {
    apiMock.createProject.mockResolvedValue({ id: 'p1', name: 'demo' })
    apiMock.uploadVideo.mockResolvedValue({ project_id: 'p1', job_id: 'j1', media: {} })
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1 })
      return { close: vi.fn() } as unknown as EventSource
    })
    const onUploaded = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onUploaded={onUploaded} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'my project' } })
    fireEvent.click(screen.getByRole('button', { name: /generate ai scripts/i }))

    await waitFor(() => {
      expect(apiMock.createProject).toHaveBeenCalledWith('my project')
      expect(apiMock.uploadVideo).toHaveBeenCalledWith('p1', file)
      expect(apiMock.pollJob).toHaveBeenCalledWith('j1', expect.any(Function))
      expect(onUploaded).toHaveBeenCalledWith('p1')
    })
  })

  it('blocks submission until a file is chosen', () => {
    const { container } = render(<Upload onUploaded={vi.fn()} />)
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
    const button = screen.getByRole('button', { name: /generate ai scripts/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('selects a dropped video file and rejects non-video drops', () => {
    render(<Upload onUploaded={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const videoFile = new File(['v'], 'clip.mp4', { type: 'video/mp4' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [videoFile] } })
    expect(screen.getByText('clip.mp4')).toBeTruthy()

    // Remove it, then drop a non-video
    fireEvent.click(screen.getByRole('button', { name: /remove file/i }))
    const badFile = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [badFile] } })
    expect(screen.getByRole('alert').textContent).toMatch(/not a video/i)
  })

  it('shows progress while processing', async () => {
    apiMock.createProject.mockResolvedValue({ id: 'p2', name: 'demo' })
    apiMock.uploadVideo.mockResolvedValue({ project_id: 'p2', job_id: 'j2', media: {} })
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'running', progress: 0.5 })
      return { close: vi.fn() } as unknown as EventSource
    })
    const onUploaded = vi.fn()
    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    const { container } = render(<Upload onUploaded={onUploaded} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    fireEvent.click(screen.getByRole('button', { name: /generate ai scripts/i }))
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy())
    expect(screen.getByText(/50%/)).toBeTruthy()
    expect(onUploaded).not.toHaveBeenCalled()
  })
})