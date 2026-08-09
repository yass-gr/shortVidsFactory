import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Editor from '../pages/Editor.jsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  getSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  getMusic: vi.fn(),
  exportProject: vi.fn(),
  pollJob: vi.fn(),
  revealDirectory: vi.fn(),
}))

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
    api.getMusic.mockResolvedValue({ tracks: [], social: false, uses_local: true })
  })

  it('loads the snapshot on mount and feeds its cuts into the timeline', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(screen.getByTestId('timeline-cut-1')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    expect(screen.getByDisplayValue('First')).toBeTruthy()
    expect(screen.getByTestId('font-select').value).toBe('Roboto')
  })

  it('falls back to empty cuts and default font when the snapshot is absent', async () => {
    api.getSnapshot.mockRejectedValue(new Error('No snapshot yet'))
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalled())
    expect(screen.queryByTestId('timeline-cut-0')).toBeNull()
    expect(screen.getByTestId('font-select').value).toBe('Arial')
  })

  it('keeps the refreshed export path after a successful export when saving', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    api.saveSnapshot.mockResolvedValue({})
    api.exportProject.mockResolvedValue({ job_id: 'j2' })
    api.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress({
        status: 'done',
        progress: 1,
        result: { exported: true, path: '/new/path/shortvids_export.mp4' },
      })
      return { close: vi.fn() }
    })
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
    fireEvent.change(screen.getByTestId('export-destination'), { target: { value: '/new/path' } })
    fireEvent.click(screen.getByTestId('export-button'))
    await waitFor(() => expect(screen.getByTestId('export-success')).toBeTruthy())

    fireEvent.click(screen.getByTestId('inspector-save'))
    await waitFor(() =>
      expect(api.saveSnapshot).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ export_path: '/new/path/shortvids_export.mp4' }),
      ),
    )
  })

  it('saves cuts, font, and music edits back to the snapshot', async () => {
    api.getSnapshot.mockResolvedValue(SNAPSHOT)
    api.getMusic.mockResolvedValue({
      tracks: [{ id: 'm1', title: 'Upbeat', source: 'local', path: '/music/a.mp3' }],
      social: false,
      uses_local: true,
    })
    api.saveSnapshot.mockResolvedValue({})
    render(<Editor projectId="p1" />)

    await waitFor(() => expect(screen.getByTestId('timeline-cut-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-0'))
    fireEvent.change(screen.getByTestId('caption-text-0'), { target: { value: 'Edited' } })
    fireEvent.change(screen.getByTestId('font-select'), { target: { value: 'OpenSans' } })
    await waitFor(() => expect(screen.getByText('Upbeat')).toBeTruthy())
    fireEvent.change(screen.getByTestId('music-select'), { target: { value: 'm1' } })
    fireEvent.click(screen.getByTestId('inspector-save'))

    await waitFor(() =>
      expect(api.saveSnapshot).toHaveBeenCalledWith('p1', {
        cuts: [
          { source_start: 0, source_end: 2, caption_lines: [{ start: 0, end: 2, text: 'Edited' }] },
          { source_start: 2, source_end: 5, caption_lines: [{ start: 2, end: 5, text: 'Second' }] },
        ],
        music: {
          source: 'local',
          path: '/music/a.mp3',
          offset: 0,
          trim_start: 0,
          trim_end: null,
          volume: 0.8,
          duck: true,
        },
        font: 'OpenSans',
        export_path: 'out.mp4',
      }),
    )
  })
})
