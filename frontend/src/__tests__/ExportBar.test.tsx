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

  it('saves, exports, then navigates to the export screen without revealing the folder inline', async () => {
    const onNavigateExport = vi.fn()
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled onNavigateExport={onNavigateExport} />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(apiMock.saveSnapshot).toHaveBeenCalledWith('p1', SNAPSHOT))
    await waitFor(() => expect(apiMock.exportProject).toHaveBeenCalledWith('p1', '/tmp/vids'))
    await waitFor(() => expect(onNavigateExport).toHaveBeenCalledWith('j1', '/tmp/vids'))
    expect(apiMock.revealDirectory).not.toHaveBeenCalled()
  })

  it('keeps the destination input editable', () => {
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled />)
    const input = screen.getByTestId('export-destination') as HTMLInputElement
    fireEvent.change(input, { target: { value: '/tmp/newdir' } })
    expect(input.value).toBe('/tmp/newdir')
  })

  it('does not navigate when the export job fails to start', async () => {
    apiMock.exportProject.mockRejectedValue(new Error('kaboom'))
    const onNavigateExport = vi.fn()
    render(<ExportBar projectId="p1" snapshot={SNAPSHOT} enabled onNavigateExport={onNavigateExport} />)
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/tmp/vids' } })
    fireEvent.click(screen.getByTestId('export-button'))

    await waitFor(() => expect(onNavigateExport).not.toHaveBeenCalled())
    expect(screen.getByText(/kaboom/)).toBeTruthy()
  })
})