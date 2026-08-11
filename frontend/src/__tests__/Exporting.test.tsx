import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Exporting from '../pages/Exporting.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  pollJob: vi.fn(),
  revealDirectory: vi.fn(),
}))

const apiMock = vi.mocked(api)

function renderExporting(overrides = {}) {
  return render(
    <Exporting
      projectId="p1"
      jobId="j1"
      destination="/tmp/vids"
      onBack={vi.fn()}
      {...overrides}
    />,
  )
}

describe('Exporting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows processing progress and mapped steps from job events', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'running', progress: 0.5 })
      return { close: vi.fn() } as unknown as EventSource
    })
    renderExporting()
    await waitFor(() => expect(apiMock.pollJob).toHaveBeenCalledWith('j1', expect.any(Function)))
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(screen.getByText(/50%/)).toBeTruthy()
  })

  it('marks step trackers complete as progress rises', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'running', progress: 0.85 })
      return { close: vi.fn() } as unknown as EventSource
    })
    renderExporting()
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy())
    expect(screen.getAllByText(/done/i).length).toBeGreaterThanOrEqual(2)
  })

  it('shows success, then revealDirectory on Open Folder', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1, result: { path: '/tmp/vids/out.mp4' } })
      return { close: vi.fn() } as unknown as EventSource
    })
    apiMock.revealDirectory.mockResolvedValue({ ok: true })
    renderExporting()
    await waitFor(() => expect(screen.getByText(/export completed/i)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /open folder/i }))
    expect(apiMock.revealDirectory).toHaveBeenCalled()
  })

  it('shows error state and calls onBack from the back button', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'error', progress: 1, error: 'boom' })
      return { close: vi.fn() } as unknown as EventSource
    })
    const onBack = vi.fn()
    renderExporting({ onBack })
    await waitFor(() => expect(screen.getByText(/boom/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /back to editor/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
