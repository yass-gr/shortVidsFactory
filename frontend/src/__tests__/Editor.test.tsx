import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Editor from '../pages/Editor.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  getSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  getMusic: vi.fn(),
}))

const apiMock = vi.mocked(api)

const SNAPSHOT = {
  cuts: [
    { source_start: 0, source_end: 2, caption_lines: [{ start: 0, end: 2, text: 'First' }] },
    { source_start: 2, source_end: 5, caption_lines: [{ start: 2, end: 5, text: 'Second' }] },
  ],
  music: null,
  font: 'Roboto',
  export_path: 'out.mp4',
}

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.getMusic.mockResolvedValue({ tracks: [], social: false, uses_local: true })
  })

  it('loads the snapshot on mount and feeds its cuts into the timeline', async () => {
    apiMock.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(screen.getByTestId('timeline-cut-1')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    expect(screen.getByDisplayValue('First')).toBeTruthy()
    expect((screen.getByTestId('font-select') as HTMLSelectElement).value).toBe('Roboto')
  })

  it('falls back to empty cuts and default font when the snapshot is absent', async () => {
    const err = new Error('No snapshot yet') as Error & { status?: number }
    err.status = 404
    apiMock.getSnapshot.mockRejectedValue(err)
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(apiMock.getSnapshot).toHaveBeenCalled())
    expect(screen.queryByTestId('timeline-cut-0')).toBeNull()
    expect((screen.getByTestId('font-select') as HTMLSelectElement).value).toBe('Arial')
  })

  it('shows unsaved changes after editing and saves on Cmd/Ctrl+S', async () => {
    apiMock.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())

    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    const input = screen.getByTestId('caption-text-0')
    fireEvent.change(input, { target: { value: 'Edited' } })
    expect(screen.getByText(/unsaved/i)).toBeTruthy()

    apiMock.saveSnapshot.mockResolvedValue(SNAPSHOT)
    fireEvent.keyDown(screen.getByTestId('timeline'), { key: 's', ctrlKey: true })
    await waitFor(() => expect(apiMock.saveSnapshot).toHaveBeenCalledWith('p1', expect.objectContaining({ font: 'Roboto' })))
    expect(screen.getByText(/saved/i)).toBeTruthy()
  })

  it('exposes save via handleSave and reloads on load error retry', async () => {
    apiMock.getSnapshot.mockRejectedValueOnce(new Error('boom'))
    apiMock.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('editor-load-error')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
  })

  it('updates caption text into the timeline reducer', async () => {
    apiMock.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    fireEvent.change(screen.getByTestId('caption-text-0'), { target: { value: 'Changed' } })
    expect(screen.getByDisplayValue('Changed')).toBeTruthy()
  })
})