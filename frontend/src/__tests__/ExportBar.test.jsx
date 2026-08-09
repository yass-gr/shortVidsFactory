import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ExportBar from '../editor/ExportBar.jsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  saveSnapshot: vi.fn(),
  exportProject: vi.fn(),
  pollJob: vi.fn(),
  revealDirectory: vi.fn(),
}))

const SNAPSHOT = {
  cuts: [{ source_start: 0, source_end: 2, caption_lines: [] }],
  music: null,
  font: 'Arial',
  export_path: '',
}

describe('ExportBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.saveSnapshot.mockResolvedValue({})
    api.exportProject.mockResolvedValue({ job_id: 'j1' })
    api.revealDirectory.mockResolvedValue({ ok: true })
  })

  it('disables the export button when there are no cuts', () => {
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled={false} />)
    expect(screen.getByTestId('export-button').disabled).toBe(true)
  })

  it('enables the export button when there is at least one cut', () => {
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    expect(screen.getByTestId('export-button').disabled).toBe(false)
  })

  it('saves, exports, polls, and reveals the folder on success', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1 })
      return { close: vi.fn() }
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(api.saveSnapshot).toHaveBeenCalledWith('p1', SNAPSHOT))
    await waitFor(() => expect(api.exportProject).toHaveBeenCalledWith('p1', '/tmp/vids'))
    await waitFor(() => expect(screen.getByTestId('open-folder')).toBeTruthy())

    fireEvent.click(screen.getByTestId('open-folder'))
    expect(api.revealDirectory).toHaveBeenCalledWith('p1')
  })

  it('reports the exported path up to onExported', async () => {
    const onExported = vi.fn()
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'done', progress: 1, result: { exported: true, path: '/x/y/shortvids_export.mp4' } })
      return { close: vi.fn() }
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled onExported={onExported} />)
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(onExported).toHaveBeenCalledWith('/x/y/shortvids_export.mp4'))
  })

  it('shows the error and allows retry', async () => {
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({ status: 'error', progress: 1, error: 'kaboom' })
      return { close: vi.fn() }
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(screen.getByTestId('export-error').textContent).toContain('kaboom'))
    expect(screen.getByTestId('export-retry')).toBeTruthy()
  })
})
