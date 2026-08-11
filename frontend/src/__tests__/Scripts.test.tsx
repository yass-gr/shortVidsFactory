import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Scripts from '../pages/Scripts.tsx'
import * as api from '../api.js'
import type { ScriptSummary } from '../types'

vi.mock('../api.js', () => ({
  apiFetch: vi.fn(),
  getScripts: vi.fn(),
  generateScripts: vi.fn(),
  pollJob: vi.fn(),
  approveScript: vi.fn(),
}))

const apiMock = vi.mocked(api)

const SCRIPTS: ScriptSummary[] = [
  {
    id: 's1', hook: 'Hook one', summary: 'Summary one', words_used: 30, duration_s: 15.0,
    cuts: [{ source_start: 0, source_end: 5, caption_lines: [] }],
  },
  {
    id: 's2', hook: 'Hook two', summary: 'Summary two', words_used: 42, duration_s: 20.5,
    cuts: [
      { source_start: 0, source_end: 5, caption_lines: [] },
      { source_start: 5, source_end: 10, caption_lines: [] },
    ],
  },
  {
    id: 's3', hook: 'Hook three', summary: 'Summary three', words_used: 18, duration_s: 12.0,
    cuts: [
      { source_start: 0, source_end: 4, caption_lines: [] },
      { source_start: 4, source_end: 8, caption_lines: [] },
      { source_start: 8, source_end: 12, caption_lines: [] },
    ],
  },
]

function renderScripts(props = {}) {
  return render(<Scripts projectId="p1" onPick={vi.fn()} {...props} />)
}

describe('Scripts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading then renders script cards matching real fields', async () => {
    apiMock.getScripts.mockResolvedValue(SCRIPTS)
    renderScripts()

    await waitFor(() => {
      expect(screen.getByText('Hook one')).toBeTruthy()
      expect(screen.getByText('Summary one')).toBeTruthy()
      expect(screen.getByText('Hook two')).toBeTruthy()
      expect(screen.getByText('Hook three')).toBeTruthy()
    })
    expect(screen.getByText(/30 words/i)).toBeTruthy()
    expect(screen.getByText(/00:15/)).toBeTruthy()
    expect(screen.getByText(/1 cut/i)).toBeTruthy()
    expect(screen.getByText(/3 cuts/i)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /use this/i })).toHaveLength(3)
  })

  it('generates and polls when no saved scripts exist', async () => {
    apiMock.getScripts.mockResolvedValue({ pending: null })
    apiMock.generateScripts.mockResolvedValue({ job_id: 'j1' })
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() } as unknown as EventSource
    })
    renderScripts()

    await waitFor(() => expect(apiMock.generateScripts).toHaveBeenCalledWith('p1'))
    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
  })

  it('approves the chosen script and calls onPick', async () => {
    apiMock.getScripts.mockResolvedValue(SCRIPTS)
    apiMock.approveScript.mockResolvedValue({ cuts: [] })
    const onPick = vi.fn()
    renderScripts({ onPick })

    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /use this/i })[1])
    await waitFor(() => expect(apiMock.approveScript).toHaveBeenCalledWith('p1', 's2'))
    expect(onPick).toHaveBeenCalled()
  })

  it('re-generates on the regenerate button', async () => {
    apiMock.getScripts.mockResolvedValue(SCRIPTS)
    apiMock.generateScripts.mockResolvedValue({ job_id: 'j9' })
    apiMock.pollJob.mockImplementation((jobId, onProgress) => {
      onProgress?.({ id: jobId, status: 'done', progress: 1, result: SCRIPTS })
      return { close: vi.fn() } as unknown as EventSource
    })
    renderScripts()
    await waitFor(() => expect(screen.getByText('Hook one')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    await waitFor(() => expect(apiMock.generateScripts).toHaveBeenCalledWith('p1'))
  })
})
