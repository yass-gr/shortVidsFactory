import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ExportBar from '../editor/ExportBar.tsx'
import * as api from '../api.js'
import type { EditorSnapshot } from '../types'

vi.mock('../api.js', () => ({
  saveSnapshot: vi.fn(),
  exportProject: vi.fn(),
  pollJob: vi.fn(),
  revealDirectory: vi.fn(),
}))

const apiMock = vi.mocked(api)

const SNAPSHOT: EditorSnapshot = {
  cuts: [{ source_start: 0, source_end: 2, caption_lines: [] }],
  music: null,
  font: 'Arial',
  export_path: '',
}

describe('ExportBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.saveSnapshot.mockResolvedValue({} as EditorSnapshot)
    apiMock.exportProject.mockResolvedValue({ job_id: 'j1' })
    apiMock.revealDirectory.mockResolvedValue({ ok: true })
  })

  it('disables the export button when there are no cuts', () => {
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled={false} />)
    expect((screen.getByTestId('export-button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables the export button when there is at least one cut', () => {
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    expect((screen.getByTestId('export-button') as HTMLButtonElement).disabled).toBe(false)
  })

  it('saves, exports, polls, and reveals the folder on success', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1 })
      return { close: vi.fn() } as unknown as EventSource
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(apiMock.saveSnapshot).toHaveBeenCalledWith('p1', SNAPSHOT))
    await waitFor(() => expect(apiMock.exportProject).toHaveBeenCalledWith('p1', '/tmp/vids'))
    await waitFor(() => expect(screen.getByTestId('open-folder')).toBeTruthy())

    fireEvent.click(screen.getByTestId('open-folder'))
    expect(apiMock.revealDirectory).toHaveBeenCalledWith('p1')
  })

  it('reports the exported path up to onExported', async () => {
    const onExported = vi.fn()
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1, result: { exported: true, path: '/x/y/shortvids_export.mp4' } })
      return { close: vi.fn() } as unknown as EventSource
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled onExported={onExported} />)
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(onExported).toHaveBeenCalledWith('/x/y/shortvids_export.mp4'))
  })

  it('shows the error and allows retry', async () => {
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'error', progress: 1, error: 'kaboom' })
      return { close: vi.fn() } as unknown as EventSource
    })
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(screen.getByTestId('export-error').textContent).toContain('kaboom'))
    expect(screen.getByTestId('export-retry')).toBeTruthy()
  })
})