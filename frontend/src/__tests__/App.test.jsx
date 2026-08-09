import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'
import * as api from '../api.js'

vi.mock('../api.js', () => ({
  listProjects: vi.fn(() => Promise.resolve({ projects: [] })),
}))

describe('App', () => {
  it('renders the app heading', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'ShortVidsFactory' })).toBeTruthy()
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
  })

  it('renders the editor page with the preview player for /project/:id/editor', () => {
    render(<App initialRoute="/project/p1/editor" />)
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeTruthy()
    expect(document.querySelector('video').getAttribute('src')).toContain('/api/projects/p1/preview.mp4')
  })

  it('shows the selected-cut readout after clicking a timeline block', () => {
    render(<App initialRoute="/project/p1/editor" />)
    fireEvent.click(screen.getByTestId('timeline-cut-1'))
    expect(screen.getByTestId('editor-selected').textContent).toContain('Selected cut 2')
  })
})
