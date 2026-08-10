import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'
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
}))

describe('App', () => {
  it('renders the app heading', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'ShortVidsFactory' })).toBeTruthy()
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
  })

  it('renders the editor page with the preview player for /project/:id/editor', async () => {
    render(<App initialRoute="/project/p1/editor" />)
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeTruthy()
    expect(document.querySelector('video').getAttribute('src')).toContain('/api/projects/p1/preview.mp4')
    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalled())
  })

  it('shows the selected-cut readout after clicking a timeline block', async () => {
    render(<App initialRoute="/project/p1/editor" />)
    await waitFor(() => expect(screen.getByTestId('timeline-cut-1')).toBeTruthy())
    fireEvent.click(screen.getByTestId('timeline-cut-1'))
    expect(screen.getByTestId('editor-selected').textContent).toContain('Selected cut 2')
  })

  it('navigates to the upload page when the new project link is clicked', async () => {
    window.history.pushState({}, '', '#/')
    render(<App />)
    fireEvent.click(screen.getByText('New project'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'New project' })).toBeTruthy(),
    )
    expect(window.location.hash).toBe('#/new')
  })
})
