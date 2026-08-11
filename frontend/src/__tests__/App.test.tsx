import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.tsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  listProjects: vi.fn(() => Promise.resolve({ projects: [] })),
  getSnapshot: vi.fn(() =>
    Promise.resolve({
      cuts: [
        { source_start: 0, source_end: 1, caption_lines: [{ start: 0, end: 1, text: 'One' }] },
        { source_start: 1, source_end: 2, caption_lines: [{ start: 1, end: 2, text: 'Two' }] },
      ],
      music: null,
      font: 'Arial',
      export_path: '',
    }),
  ),
  getMusic: vi.fn(() => Promise.resolve({ tracks: [], social: false, uses_local: true })),
  createProject: vi.fn(),
  uploadVideo: vi.fn(),
  pollJob: vi.fn(),
  generateScripts: vi.fn(),
  getScripts: vi.fn(),
  approveScript: vi.fn(),
  saveSnapshot: vi.fn(),
  exportProject: vi.fn(),
  revealDirectory: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('renders the design brand and window chrome', async () => {
    render(<App />)
    expect(screen.getByText('ShortVidsFactory')).toBeTruthy()
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
  })

  it('navigates to the upload screen when the New project button is clicked', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    expect(window.location.hash).toBe('#/new')
    await waitFor(() => expect(screen.getByText('New project')).toBeTruthy())
  })

  it('renders the editor page with the preview video for /project/:id/editor', async () => {
    render(<App initialRoute="/project/p1/editor" />)
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeTruthy()
    expect(document.querySelector('video')?.getAttribute('src')).toContain('/api/projects/p1/preview.mp4')
    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalled())
  })

  it('finds projects route via hash', () => {
    window.location.hash = '#/new'
    render(<App />)
    expect(window.location.hash).toBe('#/new')
  })
})